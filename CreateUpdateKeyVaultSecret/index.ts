import * as tl from 'azure-pipelines-task-lib/task';
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
    let secretName = tl.getInput("secretName", true) as string;
    let secretValue = tl.getInput("secretValue", true) as string;

    let tagsList = tl.getInput("tagsList", false) as string;
    if(tagsList === undefined) {
      tagsList = "";
    }
    
    console.log("Azure Subscription Id: " + subcriptionId);
    console.log("ServicePrincipalId: " + servicePrincipalId);
    console.log("ServicePrincipalKey: " + servicePrincipalKey);
    console.log("Tenant Id: " + tenantId);
    console.log("Resource Group: " + resourceGroupName);
    console.log("Key Vault: " + keyVault);
    console.log("SecretName: " + secretName);
    console.log("tagsList: " + tagsList);
    
    console.log("");

    const url = 'https://' + keyVault + '.vault.azure.net';

    const creds = await LoginToAzure(servicePrincipalId, servicePrincipalKey, tenantId);
    const keyvaultCreds = <TokenCredential> <unknown>(new msRestNodeAuth.ApplicationTokenCredentials(creds.clientId, creds.domain, creds.secret, 'https://vault.azure.net'));
    const keyvaultClient = new msKeyVault.SecretClient(url, keyvaultCreds);

    let elms = tagsList.split(';');
    let mdString = undefined;
    for(let i=0;i<elms.length;i++) {
      let keyValue = elms[i].split('=');
      if(mdString === undefined) {
        mdString = "\"" + keyValue[0] + "\":\"" + keyValue[1] + "\"";
      } else {
        mdString += ",\"" + keyValue[0] + "\":\"" + keyValue[1] + "\"";
      }
    }

    let secretOptions: msKeyVault.SetSecretOptions = {};
    if(mdString !== undefined) {
      let tagsElement = JSON.parse("{" + mdString + "}");
      secretOptions.tags = { 
        tags: tagsElement
      }
    }

    let secretResult = await keyvaultClient.setSecret(secretName, secretValue, secretOptions);
    console.log(secretResult.name + " set in KeyVault");
  
  } catch (err) {
    tl.setResult(tl.TaskResult.Failed, err.message || 'run() failed');
  }
}

run();