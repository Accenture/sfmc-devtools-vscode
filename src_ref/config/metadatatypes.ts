import { TDevTools } from "@types";

const metadataTypesList: TDevTools.IMetadataTypes[] = [
	{
		name: "Asset-[Subtype]",
		apiName: "asset",
		retrieveByDefault: ["asset", "code", "textfile", "block", "message", "template", "other"],
		supports: {
			retrieve: true,
			create: true,
			update: true,
			delete: false,
			changeKey: true,
			buildTemplate: true,
			retrieveAsTemplate: true
		},
		description: "Assets from Content Builder grouped into subtypes."
	},
	{
		name: "Data Designer Attribute Groups",
		apiName: "attributeGroup",
		retrieveByDefault: true,
		supports: {
			retrieve: true,
			create: false,
			update: false,
			delete: false,
			changeKey: false,
			buildTemplate: false,
			retrieveAsTemplate: false
		},
		description: "Groupings of Attribute Sets (Data Extensions) in Data Designer."
	},
	{
		name: "Data Designer Attribute Sets",
		apiName: "attributeSet",
		retrieveByDefault: true,
		supports: {
			retrieve: true,
			create: false,
			update: false,
			delete: false,
			changeKey: false,
			buildTemplate: false,
			retrieveAsTemplate: false
		},
		description: "Data Extensions linked together in Attribute Groups in Data Designer."
	},
	{
		name: "Automation",
		apiName: "automation",
		retrieveByDefault: true,
		supports: {
			retrieve: true,
			create: true,
			update: true,
			delete: true,
			changeKey: true,
			buildTemplate: true,
			retrieveAsTemplate: true
		},
		description: "Used via Automation Studio directly - or indirectly via Journey Builder & MC Connect."
	},
	{
		name: "Campaign Tag",
		apiName: "campaign",
		retrieveByDefault: false,
		supports: {
			retrieve: true,
			create: false,
			update: false,
			delete: false,
			changeKey: false,
			buildTemplate: false,
			retrieveAsTemplate: false
		},
		description: "Way of tagging/categorizing emails, journeys and alike."
	},
	{
		name: "Content Area (Classic)",
		apiName: "contentArea",
		retrieveByDefault: false,
		supports: {
			retrieve: true,
			create: false,
			update: false,
			delete: false,
			changeKey: false,
			buildTemplate: false,
			retrieveAsTemplate: false
		},
		description:
			"DEPRECATED: Old way of saving Content Blocks; please migrate these to new Content Blocks (`Asset: ...`)."
	},
	{
		name: "Data Extension",
		apiName: "dataExtension",
		retrieveByDefault: true,
		supports: {
			retrieve: true,
			create: true,
			update: true,
			delete: true,
			changeKey: true,
			buildTemplate: true,
			retrieveAsTemplate: true
		},
		description: "Database table schemas."
	},
	{
		name: "Data Extension Field",
		apiName: "dataExtensionField",
		retrieveByDefault: false,
		supports: {
			retrieve: true,
			create: false,
			update: false,
			delete: true,
			changeKey: false,
			buildTemplate: false,
			retrieveAsTemplate: false
		},
		description: "Internal Type: Fields for type dataExtension."
	},
	{
		name: "Data Extension Template",
		apiName: "dataExtensionTemplate",
		retrieveByDefault: false,
		supports: {
			retrieve: true,
			create: false,
			update: false,
			delete: false,
			changeKey: false,
			buildTemplate: false,
			retrieveAsTemplate: false
		},
		description: "Templates used for special DE use cases like Triggered Send."
	},
	{
		name: "Automation: Data Extract Activity",
		apiName: "dataExtract",
		retrieveByDefault: true,
		supports: {
			retrieve: true,
			create: true,
			update: true,
			delete: false,
			changeKey: true,
			buildTemplate: true,
			retrieveAsTemplate: true
		},
		description: "Creates zipped files in your FTP directory or convert XML into CSV."
	},
	{
		name: "Data Extract Type",
		apiName: "dataExtractType",
		retrieveByDefault: false,
		supports: {
			retrieve: true,
			create: false,
			update: false,
			delete: false,
			changeKey: false,
			buildTemplate: false,
			retrieveAsTemplate: false
		},
		description: "Types of Data Extracts enabled for a specific business unit. This normally should not be stored."
	},
	{
		name: "API Discovery",
		apiName: "discovery",
		retrieveByDefault: false,
		supports: {
			retrieve: true,
			create: false,
			update: false,
			delete: false,
			changeKey: false,
			buildTemplate: false,
			retrieveAsTemplate: false
		},
		description:
			"Description of all API endpoints accessible via REST API; only relevant for developers of Accenture SFMC DevTools."
	},
	{
		name: "E-Mail (Classic)",
		apiName: "email",
		retrieveByDefault: false,
		supports: {
			retrieve: true,
			create: false,
			update: false,
			delete: false,
			changeKey: false,
			buildTemplate: false,
			retrieveAsTemplate: false
		},
		description: "DEPRECATED: Old way of saving E-Mails; please migrate these to new E-Mail (`Asset: message`)."
	},
	{
		name: "E-Mail Send Definition",
		apiName: "emailSend",
		retrieveByDefault: true,
		supports: {
			retrieve: true,
			create: true,
			update: true,
			delete: true,
			changeKey: true,
			buildTemplate: true,
			retrieveAsTemplate: false
		},
		description: 'Mainly used in Automations as "Send Email Activity".'
	},
	{
		name: "Journey: Entry Event Definition",
		apiName: "event",
		retrieveByDefault: true,
		supports: {
			retrieve: true,
			create: true,
			update: true,
			delete: true,
			changeKey: true,
			buildTemplate: true,
			retrieveAsTemplate: true
		},
		description: "Used in Journeys (Interactions) to define Entry Events."
	},
	{
		name: "File Location",
		apiName: "fileLocation",
		retrieveByDefault: true,
		supports: {
			retrieve: true,
			create: false,
			update: false,
			delete: false,
			changeKey: false,
			buildTemplate: false,
			retrieveAsTemplate: false
		},
		description:
			"Used for export or import of files to/from Marketing Cloud. Previously this was labeled ftpLocation."
	},
	{
		name: "Automation: File Transfer Activity",
		apiName: "fileTransfer",
		retrieveByDefault: true,
		supports: {
			retrieve: true,
			create: true,
			update: true,
			delete: false,
			changeKey: true,
			buildTemplate: true,
			retrieveAsTemplate: true
		},
		description: "Unzip, decrypt a file or move a file from secure location into FTP directory."
	},
	{
		name: "Automation: Filter Activity",
		apiName: "filter",
		retrieveByDefault: false,
		supports: {
			retrieve: true,
			create: false,
			update: false,
			delete: false,
			changeKey: false,
			buildTemplate: false,
			retrieveAsTemplate: false
		},
		description: 'BETA: Part of how filtered Data Extensions are created. Depends on type "FilterDefinitions".'
	},
	{
		name: "Folder",
		apiName: "folder",
		retrieveByDefault: false,
		supports: {
			retrieve: true,
			create: true,
			update: true,
			delete: false,
			changeKey: false,
			buildTemplate: true,
			retrieveAsTemplate: false
		},
		description: "Used to structure all kinds of other metadata."
	},
	{
		name: "Automation: Import File Activity",
		apiName: "importFile",
		retrieveByDefault: true,
		supports: {
			retrieve: true,
			create: true,
			update: true,
			delete: false,
			changeKey: true,
			buildTemplate: true,
			retrieveAsTemplate: true
		},
		description: "Reads files in FTP directory for further processing."
	},
	{
		name: "Journey",
		apiName: "journey",
		retrieveByDefault: true,
		supports: {
			retrieve: true,
			create: true,
			update: true,
			delete: true,
			changeKey: false,
			buildTemplate: true,
			retrieveAsTemplate: false
		},
		description: 'Journey (internally called "Interaction").'
	},
	{
		name: "List",
		apiName: "list",
		retrieveByDefault: true,
		supports: {
			retrieve: true,
			create: false,
			update: false,
			delete: true,
			changeKey: false,
			buildTemplate: false,
			retrieveAsTemplate: false
		},
		description: "Old way of storing data. Still used for central Email Subscriber DB."
	},
	{
		name: "Mobile Code",
		apiName: "mobileCode",
		retrieveByDefault: true,
		supports: {
			retrieve: true,
			create: false,
			update: false,
			delete: false,
			changeKey: false,
			buildTemplate: false,
			retrieveAsTemplate: false
		},
		description: "Used to send SMS Messages"
	},
	{
		name: "Mobile Keyword",
		apiName: "mobileKeyword",
		retrieveByDefault: true,
		supports: {
			retrieve: true,
			create: true,
			update: true,
			delete: true,
			changeKey: false,
			buildTemplate: true,
			retrieveAsTemplate: true
		},
		description: "Used for managing subscriptions for Mobile numbers in Mobile Connect"
	},
	{
		name: "MobileConnect SMS",
		apiName: "mobileMessage",
		retrieveByDefault: true,
		supports: {
			retrieve: true,
			create: true,
			update: true,
			delete: true,
			changeKey: false,
			buildTemplate: true,
			retrieveAsTemplate: false
		},
		description:
			"Used by Journey Builder and to send SMS from MobileConnect triggered by API or manually on-the-fly"
	},
	{
		name: "Automation: SQL Query Activity",
		apiName: "query",
		retrieveByDefault: true,
		supports: {
			retrieve: true,
			create: true,
			update: true,
			delete: true,
			changeKey: true,
			buildTemplate: true,
			retrieveAsTemplate: true
		},
		description: "Select & transform data using SQL."
	},
	{
		name: "Role",
		apiName: "role",
		retrieveByDefault: true,
		supports: {
			retrieve: true,
			create: true,
			update: true,
			delete: false,
			changeKey: true,
			buildTemplate: true,
			retrieveAsTemplate: false
		},
		description: "User Roles define groups that are used to grant users access to SFMC systems."
	},
	{
		name: "Automation: Script Activity",
		apiName: "script",
		retrieveByDefault: true,
		supports: {
			retrieve: true,
			create: true,
			update: true,
			delete: false,
			changeKey: null,
			buildTemplate: true,
			retrieveAsTemplate: true
		},
		description: "Execute more complex tasks via SSJS or AMPScript."
	},
	{
		name: "Send Classification",
		apiName: "sendClassification",
		retrieveByDefault: false,
		supports: {
			retrieve: true,
			create: false,
			update: false,
			delete: false,
			changeKey: false,
			buildTemplate: false,
			retrieveAsTemplate: false
		},
		description:
			"Lets admins define Delivery Profile, Sender Profile and CAN-SPAM for an email job in a central location."
	},
	{
		name: "Transactional Email",
		apiName: "transactionalEmail",
		retrieveByDefault: true,
		supports: {
			retrieve: true,
			create: true,
			update: true,
			delete: true,
			changeKey: false,
			buildTemplate: true,
			retrieveAsTemplate: false
		},
		description: "Lets you send immediate Email messages via API events"
	},
	{
		name: "Transactional Push",
		apiName: "transactionalPush",
		retrieveByDefault: true,
		supports: {
			retrieve: true,
			create: true,
			update: true,
			delete: true,
			changeKey: false,
			buildTemplate: true,
			retrieveAsTemplate: false
		},
		description: "Lets you send immediate Push messages via API events"
	},
	{
		name: "Transactional SMS",
		apiName: "transactionalSMS",
		retrieveByDefault: true,
		supports: {
			retrieve: true,
			create: true,
			update: true,
			delete: true,
			changeKey: false,
			buildTemplate: true,
			retrieveAsTemplate: false
		},
		description: "Lets you send immediate SMS messages via API events"
	},
	{
		name: "Triggered Send",
		apiName: "triggeredSend",
		retrieveByDefault: true,
		supports: {
			retrieve: true,
			create: true,
			update: true,
			delete: true,
			changeKey: true,
			buildTemplate: true,
			retrieveAsTemplate: false
		},
		description: "DEPRECATED: Sends emails via API or DataExtension Event."
	},
	{
		name: "User",
		apiName: "user",
		retrieveByDefault: false,
		supports: {
			retrieve: true,
			create: true,
			update: true,
			delete: false,
			changeKey: true,
			buildTemplate: true,
			retrieveAsTemplate: false
		},
		description: "Marketing Cloud users"
	},
	{
		name: "Automation: Verification Activity",
		apiName: "verification",
		retrieveByDefault: true,
		supports: {
			retrieve: true,
			create: true,
			update: true,
			delete: true,
			changeKey: false,
			buildTemplate: true,
			retrieveAsTemplate: false
		},
		description: "Check DataExtension for a row count"
	}
];

export { metadataTypesList };
