import {getInput, setFailed} from "@actions/core";
import axios, {AxiosResponse} from 'axios';
import path from "path";
import fsPromises from 'fs/promises';

const TAG = getInput('tag');
const DESTINATION = getInput('destination');
const MODELER_CLIENT_ID = getInput('client_id')
const MODELER_CLIENT_SECRET = getInput('client_secret')
let FILENAMES: string[] = [];

const getToken = async () => {

    try {
        const url = 'https://login.cloud.camunda.io/oauth/token';
        const data = {
            grant_type: 'client_credentials',
            audience: 'api.cloud.camunda.io',
            client_id: MODELER_CLIENT_ID,
            client_secret: MODELER_CLIENT_SECRET
        };

        const response = await axios.post(url, data, {
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (response.status === 200) {
            const token = response.data.access_token

            // Remove all whitespaces from token
            return token.replace(/\s+/g, '');

        } else {
            console.error('Error:', response.statusText);
            return null;
        }
    } catch (error) {
        setFailed(error instanceof Error ? error.message : 'An error occurred');
        return null;
    }
}


const getFileIdsByMilestoneTag = async (token: string) => {
    const urlMilestone = 'https://modeler.cloud.camunda.io/api/beta/milestones/search';
    const body = {
        "filter": {
            "id": null, "name": TAG, "created": null, "createdBy": {
                "id": null, "name": null
            }, "updated": null, "updatedBy": {
                "id": null, "name": null
            }
        }, "sort": [{
            "field": "string", "direction": "ASC"
        }], "page": 0, "size": 50
    };

    try {
        const response = await axios.post(urlMilestone, body, {
            headers: {
                'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`
            }
        });

        return response.data.items.map((item: any) => item.fileId);

    } catch (error) {
        setFailed(error instanceof Error ? error.message : 'An error occurred');
    }
}


const getFileContent = async (token: string, fileIds: string[]) => {
    const baseUrl = 'https://modeler.cloud.camunda.io/api/beta/files/';

    try {
        const responses = await Promise.all(fileIds.map(async (id) => {
            const url = `${baseUrl}${id}`;
            try {
                const response = await axios.get(url, {
                    headers: {
                        'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`,
                    },
                }) as AxiosResponse<any>;

                return response.data;
            } catch (error) {

                setFailed(error instanceof Error ? error.message : `Error fetching file with id ${id}: error.message`);
                return null;
            }
        }));

        const validFileContent = responses.filter((data) => data !== null);

        FILENAMES = validFileContent.map((data) => data.metadata.name);

        return validFileContent;
    } catch (error) {

        setFailed(error instanceof Error ? error.message : `Error fetching files`);

    }
};


interface FileContent {
    metadata: {
        name: string;
    };
    content: string;
}


const downloadFiles = async (data: string, destinationFolderPath: string, fileName: string): Promise<void> => {
    try {

        const destinationFilePath = path.join(destinationFolderPath, `${fileName}.bpmn`);
        await fsPromises.mkdir(destinationFolderPath, {recursive: true});
        await fsPromises.writeFile(destinationFilePath, data);

        console.log(`File content saved to: ${destinationFilePath}`);
    } catch (error) {
        setFailed(error instanceof Error ? error.message : 'An error occurred');
    }
};

const runWorkflow = async () => {

    try {

        const token = await getToken();
        console.log(`Fetching files with tag ${TAG}`);

        const fileIds = await getFileIdsByMilestoneTag(token);
        const fileContent = await getFileContent(token, fileIds) as FileContent[];

        for (const content of fileContent) {

            await downloadFiles(content.content, DESTINATION, content.metadata.name);
        }


    } catch (error) {
        setFailed(error instanceof Error ? error.message : 'An error occurred');
    }

}

runWorkflow()
    .then(() => {
        console.log("Workflow completed successfully.");
    })
    .catch((error) => {
        console.error("Workflow failed:", error);
    });