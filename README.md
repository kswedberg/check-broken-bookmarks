# Check Broken Bookmarks

This is a personal repo that I use in conjuction with the [New Tab Bookmarks](https://github.com/kswedberg/new-tab-bookmarks) web extension to clean up my browser bookmarks and remove any that are broken.

Before going through the process of cleaning up your bookmarks, you'll need to load the New Tab Bookmarks extension, clone this repo, and run `yarn install` from this repo's root directory.

The process goes like this:

## Prepare the full list of bookmarks to scan

1. With the New Tab Bookmarks extension enabled, a new tab in your browser
2. Click the "more »" link at the bottom of the left-hand nav to open the settings page
3. Copy the "Shallow list" of bookmarks from the textarea
4. Paste that list into a file, preferably in this project's `sources` directory, and give it a name with a `.json` extension.

## Create a json file of broken links

1. On the command line from the root directory of this repo, run `npm start` and answer the prompts
2. Wait for the process to finish and note the file output with the line "Writing broken links to file..."

## Clean up the broken bookmarks

1. Back in the settings page of the New Tab Bookmarks extension, load the broken bookmarks file using the file input
2. Review the list of broken bookmarks. You can filter them by error status code (`-1` means there was no response at all)
3. You can remove broken bookmarks individually (with trash-can button next to each one) or en masse (with the "Delete n bookmarks" button above the list).
4. If you see some false positives, click the "check" button next to bookmarks you want to keep.
5. You can also edit links if you know how to fix them.
