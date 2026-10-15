## Create an SFMC Installed Package

1. Log in to your Salesforce Marketing Cloud account
2. Navigate to **Setup** → **Platform Tools** → **Apps** → **Installed Packages**
3. Click **New** and create a package with **Server-to-Server** integration type
4. Note the **Client ID**, **Client Secret**, and **Authentication Base URI**

These credentials will be needed when initializing your mcdev project. Grant the API permissions required for the metadata you manage. mcdev compares the granted scopes with its SDK's supported scopes and warns about missing permissions; review those warnings before running commands.
