/* eslint-disable @typescript-eslint/naming-convention */
// import { window, ExtensionContext } from 'vscode';
// import { activateEditorSettings } from '../../editor/editorSettings';
// import { execInWindowTerminal } from '../../shared/utils/terminal';
// import { isFileInFolder } from '../../shared/utils/file';

// interface DevToolsForm {
//     credentialName: string,
//     client_id: string,
//     client_secret: string,
//     auth_url: string,
//     account_id: string,
//     gitRemoteUrl: string
// };
// const INIT_DEVTOOLS_CMD: string = 'mcdev init';
// const INIT_DEVTOOLS_FILES: Array<string> = [".mcdevrc.json", ".mcdev-auth.json"];
// const INIT_FORM_PLACEHOLDERS: { [key: string]: string } = {
//     credentialName: 'Type the Credential name of your Business Unit...',
//     client_id: 'Type the Salesforce Marketing Cloud client ID...',
//     client_secret: 'Type the Salesforce Marketing Cloud client secret...',
//     auth_url: 'Type the Salesforce Marketing Cloud Authentication Base URI...',
//     account_id: 'Type the Salesforce Marketing Cloud MID of the parent BU...',
//     gitRemoteUrl: 'Type the URL of your git remote repository...'
// };

// const MESSAGES: {[key: string]: string } = {
//     initDevToolsRequest: "Do you wish to initialize SFMC DevTools?",
//     initDevTools: "Initalizing DevTools..."
// };

// export async function initHelper(context: ExtensionContext){
//     const isInitiated = await isProjectInitiated();
//     if(!isInitiated){
//         let response = await window.showInformationMessage(MESSAGES['initDevToolsRequest'], ...["Yes", "No"]);
//         if(response && response.toLowerCase() === "yes"){
//             await initializeDevTools();
//             activateEditorSettings(context);
//         }
//     }else{
//         activateEditorSettings(context);
//     }
// }

// async function initializeDevTools(){
//     let inputForm: DevToolsForm = {
//         credentialName: '',
//         client_id: ' ',
//         client_secret: '',
//         auth_url: '',
//         account_id: '',
//         gitRemoteUrl: ''
//     };

//     for(const key in inputForm){
//         do{
//             inputForm = {
//                 ...inputForm,
//                 [key]: await window.showInputBox({ 
//                     placeHolder: INIT_FORM_PLACEHOLDERS[key], 
//                     ignoreFocusOut: true
//                 })
//             };
//         }while(
//             inputForm[key as keyof DevToolsForm] === '' || 
//             inputForm[key as keyof DevToolsForm] === undefined
//         );
//     }
    
//     const initCmd: string = Object.keys(inputForm).reduce(
//         (prevValue, currValue) => (prevValue += ` --y.${currValue} ${inputForm[currValue as keyof DevToolsForm]}`), 
//         INIT_DEVTOOLS_CMD
//     );
//     execInWindowTerminal(initCmd);
// }

// async function isProjectInitiated(){
//     const fileExistsList = await Promise.all(INIT_DEVTOOLS_FILES.map(async file => await isFileInFolder(file)));
//     return fileExistsList.every(res => res === true);
// }