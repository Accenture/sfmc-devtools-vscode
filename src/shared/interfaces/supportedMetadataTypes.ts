interface SupportedMetadataTypes {
    name: string,
    apiName: string,
    retrieveByDefault: boolean,
    supports: {[key: string]: boolean },
    description: string
}

export default SupportedMetadataTypes;