import * as tl from 'azure-pipelines-task-lib';
let fs = require('fs');
import * as msRestNodeAuth from '@azure/ms-rest-nodeauth';
import * as msKeyVault from '@azure/keyvault-secrets';
import { TokenCredential } from '@azure/core-auth';

async function LoginToAzure(servicePrincipalId:string, servicePrincipalKey:string, tenantId:string) {
  return await msRestNodeAuth.loginWithServicePrincipalSecret(servicePrincipalId, servicePrincipalKey, tenantId );
};

async function run() {
  try {
    let azureSubscriptionEndpoint = tl.getInput("azureSubscriptionEndpoint", true) as string;
    let subcriptionId = tl.getEndpointDataParameter(azureSubscriptionEndpoint, "subscriptionId", false) as string;
    let servicePrincipalId = tl.getEndpointAuthorizationParameter(azureSubscriptionEndpoint, "serviceprincipalid", false) as string;
    let servicePrincipalKey = tl.getEndpointAuthorizationParameter(azureSubscriptionEndpoint, "serviceprincipalkey", false) as string;
    let tenantId = tl.getEndpointAuthorizationParameter(azureSubscriptionEndpoint,"tenantid", false) as string;

    let resourceGroupName = tl.getInput("resourceGroupName", true) as string;
    let keyVault = tl.getInput("keyVaultName", true) as string;
    let secretsFilePath = tl.getInput("secretsFilePath", true) as string;
    
    console.log("Azure Subscription Id: " + subcriptionId);
    console.log("ServicePrincipalId: " + servicePrincipalId);
    console.log("ServicePrincipalKey: " + servicePrincipalKey);
    console.log("Tenant Id: " + tenantId);
    console.log("Resource Group: " + resourceGroupName);
    console.log("Key Vault: " + keyVault);
    console.log("Secret File Path: '" + secretsFilePath + "'");
    console.log("");

    const url = 'https://' + keyVault + '.vault.azure.net';

    fs.access(secretsFilePath, fs.F_OK, async (err:any) => {
      if(err){
        tl.setResult(tl.TaskResult.Failed, 'File not found' || 'run() failed');
        throw new Error('File not found');
      } else {
        try {
          let rawdata = fs.readFileSync(secretsFilePath);
          let secretsContent = JSON.parse(rawdata);

          let getOptions = {
            hostname: url,
            port: 443,
            method: 'GET'
          };

          let httpResponse = await httpsGetRequest(getOptions);
          console.log(JSON.stringify(httpResponse));
          console.log("Url: " + url + " - StatusCode: " + httpResponse.statusCode);

          const creds = await LoginToAzure(servicePrincipalId, servicePrincipalKey, tenantId);
          const keyvaultCreds = <TokenCredential> <unknown>(new msRestNodeAuth.ApplicationTokenCredentials(creds.clientId, creds.domain, creds.secret, 'https://vault.azure.net'));
          const keyvaultClient = new msKeyVault.SecretClient(url, keyvaultCreds);
          for(var s=0;s<secretsContent.length;s++){
            let secret = secretsContent[s];
            let secretResult = await keyvaultClient.setSecret(secret.secret, secret.value);
          }
        } catch (err) {
          console.log("error");
          tl.setResult(tl.TaskResult.Failed, err.message || 'run() failed');
        }
      }
    });
  } catch (err) {
    tl.setResult(tl.TaskResult.Failed, err.message || 'run() failed');
  }
}

run();
