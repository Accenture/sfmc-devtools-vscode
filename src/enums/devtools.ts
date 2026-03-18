/**
 * Enum representing the options for copying to Business Unit (BU).
 *
 * @enum {string}
 */
enum CopyToBUOptions {
	"Copy" = "copy",
	"Copy And Deploy" = "copy and deploy"
}

/**
 * Enum representing the options for changing the key of a metadata item.
 *
 * @enum {string}
 */
enum ChangeKeyOptions {
	"Field" = "field",
	"Custom Value" = "custom value"
}

export { CopyToBUOptions, ChangeKeyOptions };
