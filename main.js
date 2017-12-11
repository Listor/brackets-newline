/*
    Newline
    Copyright (c) LonelyStorm, All rights reserved.

    This library is free software; you can redistribute it and/or
    modify it under the terms of the GNU Lesser General Public
    License as published by the Free Software Foundation; either
    version 3.0 of the License, or (at your option) any later version.

    This library is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
    Lesser General Public License for more details.

    You should have received a copy of the GNU Lesser General Public
    License along with this library.
*/

/*jslint vars: true, plusplus: true, devel: true, nomen: true, regexp: true, indent: 4, maxerr: 50*/
/*global define, $, brackets, require*/

require.config({
    paths: {
        "text" : "lib/text",
        "i18n" : "lib/i18n"
    },
    locale: brackets.getLocale()
});

define(function (require, exports, module) {

    "use strict";

    // Brackets Modules.
    var AppInit = brackets.getModule("utils/AppInit"),
        CommandManager = brackets.getModule("command/CommandManager"),
        Commands = brackets.getModule("command/Commands"),
        EditorManager = brackets.getModule("editor/EditorManager"),
        ExtensionUtils = brackets.getModule("utils/ExtensionUtils"),
        FileSyncManager = brackets.getModule("project/FileSyncManager"),
        FileUtils = brackets.getModule("file/FileUtils"),
        StatusBar = brackets.getModule("widgets/StatusBar"),
        PreferencesManager = brackets.getModule("preferences/PreferencesManager");

    // Internal Modules.
    var Strings = require("strings");

    // StatusBar Indicators.
    var $newline = $("<div></div>");

    /**
     * Get the document text.
     */
    function _getDocumentText(document) {
        return document.getText(true);
    }

    /**
     * Converts the text to use the newline type.
     */
    function _convertText(text, newline) {
        return FileUtils.translateLineEndings(text, newline);
    }

    /**
     * Writes an document.
     */
    function _updateDocument(document, text) {
        var promise = FileUtils.writeText(document.file, text);
        promise.fail(function (error) {
            console.log("Error writing contents of " + document.file.fullPath, error);
        });
        return promise;
    }

    /**
     * Reloads an document.
     */
    function _reloadDocument(document) {
        var promise = FileUtils.readAsText(document.file);
        promise.done(function (text, readTimestamp) {
            document.refreshText(text, readTimestamp);
        });
        promise.fail(function (error) {
            console.log("Error reloading contents of " + document.file.fullPath, error);
        });
        return promise;
    }

    /*
     * Detects the newline type.
     */
    function _currentNewLineType(document) {
        var type = FileUtils.sniffLineEndings(document.getText(true));
        switch (type) {
        case FileUtils.LINE_ENDINGS_CRLF:
            return FileUtils.LINE_ENDINGS_CRLF;
        case FileUtils.LINE_ENDINGS_LF:
            return FileUtils.LINE_ENDINGS_LF;
        default:
            return FileUtils.getPlatformLineEndings();
        }
    }

    /*
     * Toggles (flip) the newline type.
     */
    function _toggleNewLineType(document) {
        var type = _currentNewLineType(document);
        switch (type) {
        case FileUtils.LINE_ENDINGS_CRLF:
            return FileUtils.LINE_ENDINGS_LF;
        case FileUtils.LINE_ENDINGS_LF:
            return FileUtils.LINE_ENDINGS_CRLF;
        default:
            return FileUtils.getPlatformLineEndings();
        }
    }

    /*
     * Updates the status bar indicator.
     */
    function _updateNewLineStatus(document) {
        switch (_currentNewLineType(document)) {
        case FileUtils.LINE_ENDINGS_CRLF:
            $newline.text(Strings.NEWLINE_CRLF);
            $newline.attr("title", Strings.NEWLINE_CONVERT_CRLF_TO_LF);
            break;
        case FileUtils.LINE_ENDINGS_LF:
            $newline.text(Strings.NEWLINE_LF);
            $newline.attr("title", Strings.NEWLINE_CONVERT_LF_TO_CRLF);
            break;
        }
    }

    /**
     * Handles Active Editor Change (ACE...) event.
     */
    function _onActiveEditorChange(event, current, previous) {
        if (current) {
            if(_checkIfUpdateNeeded(current.document)) {
                console.log('autoUpdated File ' + current.document.file._name + ' to defaultNewline');
                _convertCurrentDocument();
            }
            else {
                _updateNewLineStatus(current.document);
            }
        }
    }
  
    /**
     * Gets the Settings
     */
    function _getSettings() {
        var prefs = PreferencesManager.getExtensionPrefs("brackets-newline");

        return prefs.get("settings");
    }
  
    /**
     * Checks if a document needs to be updated when the default newline is specified in preferences
     */
    function _checkIfUpdateNeeded(document) {
        var settings = _getSettings(),
            update = false;

        if(typeof settings !== 'undefined') {
            var currentNewLineType = _currentNewLineType(document);
			
            if(currentNewLineType !== settings.defaultNewline) {
                update = true;
            }
        }

        return update;
    }
  

    /**
     * Initialization.
     */
    function _init() {
        $newline.on("click", function () {
            _convertCurrentDocument();
        });
    }
  
    /**
     * Converts the current document
     */
    function _convertCurrentDocument() {
        var current = EditorManager.getCurrentFullEditor();
        if (current) {
            var document = current.document;
            if (document) {
                var text = _convertText(_getDocumentText(document), _toggleNewLineType(document));
                var promise = _updateDocument(document, text);
                promise.done(function () {
                    var promise = _reloadDocument(document);
                    promise.done(function () {
                        _updateNewLineStatus(document);
                    });
                });
            }
        }
    }
  

    ExtensionUtils.loadStyleSheet(module, "styles/newline.css");

    StatusBar.addIndicator("status-newline", $newline, true);
    EditorManager.on("activeEditorChange", _onActiveEditorChange);

    AppInit.htmlReady(_init);
    AppInit.appReady(function () {
        _onActiveEditorChange(null, EditorManager.getActiveEditor(), null);
    });

});
