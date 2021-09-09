# pulumi-provisioning


### Install Pulumi
`brew install pulumi`

### Create new Pulumi project
https://www.pulumi.com/docs/reference/cli/pulumi_new/
`pulumi new aws-typescript`


### Deploy stack
`pulumi up`

### View result/exported data from deploy
`pulumi stack output [var name from pulumi index.ts file]`
eg: `curl $(pulumi stack output bucketEndpoint)`

### Destroy stack from origin
`pulumi destroy`

### Destroy the stack meta
https://www.pulumi.com/docs/reference/cli/pulumi_stack_rm/
`pulumi stack rm`

## AWS
Get started https://www.pulumi.com/docs/get-started/aws/
