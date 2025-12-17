import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";


const size = 't2.micro';
const name = "check24-backend";
const identity = aws.getCallerIdentity();
export const accountId = identity.then(t => t.accountId);

const ami = aws.ec2.getAmiOutput({
   filters: [
       {
          name: 'name',
           values: ['amzn2-ami-hvm-*']
       },
       {
           name: "architecture",
           values: ["x86_64"],
       }
   ],
    owners: ["137112412989"],
    mostRecent: true
});

const vpc = new aws.ec2.Vpc(`${name}-vpc`, {
    cidrBlock: "10.0.0.0/16",
    enableDnsHostnames: true,
});

const publicSubnet = new aws.ec2.Subnet("public-subnet", {
    vpcId: vpc.id,
    cidrBlock: "10.0.1.0/24",
    mapPublicIpOnLaunch: true,
});

const igw = new aws.ec2.InternetGateway("vpc-igw", {
    vpcId: vpc.id,
});

const routeTable = new aws.ec2.RouteTable("public-rt", {
    vpcId: vpc.id,
});

new aws.ec2.Route("default-route", {
    routeTableId: routeTable.id,
    destinationCidrBlock: '0.0.0.0/0',
    gatewayId: igw.id,
});

new aws.ec2.RouteTableAssociation("public-subnet-association", {
    subnetId: publicSubnet.id,
    routeTableId: routeTable.id,
});

const group = new aws.ec2.SecurityGroup(`${name}-security-group`, {
    ingress: [
        { protocol: 'tcp', fromPort: 22, toPort: 22, cidrBlocks: ['0.0.0.0/0'] },
        { protocol: 'tcp', fromPort: 8080, toPort: 8080, cidrBlocks: ['0.0.0.0/0']  },
    ],
    vpcId: vpc.id,
});

const userData = `#!/bin/bash
set -xe

yum update -y

yum install -y docker
systemctl enable docker
systemctl start docker
usermod -aG docker ec2-user

docker pull ghcr.io/havenousername/hackatum-check24-backend:latest
docker run -d -p 8080:8080 ghcr.io/havenousername/hackatum-check24-backend:latest
`;

const server = new aws.ec2.Instance(`${name}-server`, {
    instanceType: size,
    vpcSecurityGroupIds: [ group.id ],
    ami: ami.id,
    userData: userData,
    subnetId: publicSubnet.id,
    associatePublicIpAddress: true,
});

export const publicIp = server.publicIp;
export const publicHostName = server.publicDns;


