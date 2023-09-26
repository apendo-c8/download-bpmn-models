### Description

Automate the process of downloading BPMN models from the Camunda Web Modeler API using this GitHub Action. This action is part of a suite of actions designed to streamline the CI/CD pipeline for managing BPMN process models.

### Usage

To use this action in your workflow, follow these steps:

**Set Up Camunda API Access:**

Ensure you have correct credentials to authorize the [Camunda Modeler API](https://docs.camunda.io/docs/next/apis-tools/web-modeler-api/)

You can simply refer to this GitHub action in any GitHub workflow.:

   ```yaml
         - name: Download BPMN Models
           uses: apendo-c8/download-bpmn-models@v1
           with:
             tag: 'Tag name (${{ github.ref_name }} will reference the latest pushed tag or branch)'
             destination: 'Location of the downloaded BPMN models'
             client_id: 'Camunda Modeler API Client ID'   
             client_secret: 'Camunda Modeler API Client Secret'