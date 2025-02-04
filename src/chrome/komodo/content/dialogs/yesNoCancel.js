/* Copyright (c) 2000-2006 ActiveState Software Inc.
   See the file LICENSE.txt for licensing information. */

/* -*- Mode: JavaScript; tab-width: 4; indent-tabs-mode: nil; c-basic-offset: 2 -*-
 *
 * Ask the user a Yes/No/Cancel question.
 *
 * Usage:
 *  All dialog interaction is done via an object passed in and out as the first
 *  window argument: window.arguments[0]. All these arguments are optional.
 *      .prompt         the question to ask.
 *      .response       the default response, must be "Yes", "No" or "Cancel"
 *      .text           allows you to specify a string of text that will be
 *                      display in a non-edittable selectable text box. If
 *                      "text" is null or no specified then this textbox will
 *                      no be shown.
 *      .title          the dialog title
 *      .doNotAskUI     show the "Don't ask me again" UI
 *      .style          The class attribute to be applied to the dialog icon.
 *      .helpTopic      Help topic, to be passed to "ko.help.open()"
 *  On return window.arguments[0] has:
 *      .response       "Yes", "No" or "Cancel"
 *      .doNotAsk       (iff .doNotAskUI) a boolean indicating if this question
 *                      need be asked again.
 *
 */

var log = ko.logging.getLogger("dialogs.yesNoCancel");
//log.setLevel(ko.logging.LOG_DEBUG);

var gDoNotAskUI = false; // true iff "Don't ask me again" UI is being used.
var gHelpTopic = null;
var yesButton;
var noButton;
var cancelButton;
//---- interface routines for XUL

function OnLoad()
{
    var dialog = document.getElementById("dialog-yesnocancel")
    var labels = window.arguments[0].labels;
    if (typeof(labels) == 'undefined') labels = ["Yes","No","Cancel"];

    yesButton = dialog.getButton("accept");
    yesButton.setAttribute("label", labels[0]);
    yesButton.setAttribute("accesskey", "y");
    noButton = dialog.getButton("extra1");
    noButton.setAttribute("label", labels[1]);
    noButton.setAttribute("accesskey", "n");
    cancelButton = dialog.getButton("cancel");
    cancelButton.setAttribute("label", labels[2]);
    cancelButton.setAttribute("accesskey", "c");
    var style = window.arguments[0].style;
    document.getElementById("dialog-icon").setAttribute('class', style);

    // .prompt
    var descWidget = document.getElementById("prompt");
    var desc = window.arguments[0].prompt;
    if (typeof desc != "undefined" && desc != null) {
        var textUtils = Components.classes["@activestate.com/koTextUtils;1"]
                            .getService(Components.interfaces.koITextUtils);
        desc = textUtils.break_up_words(desc, 50);
        var textNode = document.createTextNode(desc);
        descWidget.appendChild(textNode);
    } else {
        descWidget.setAttribute("collapsed", "true");
    }

    // .response
    var response = window.arguments[0].response;
    if (typeof response == "undefined" || response == null) {
        response = "Yes";
    }
    log.info("default response: "+response);
    switch (response) {
    case labels[0]:
        // "Yes" button is the hardcoded default already.
        yesButton.focus();
        break;
    case labels[1]:
        dialog.setAttribute('defaultButton', 'extra1');
        yesButton.removeAttribute("default");
        log.debug("set No button as default");
        noButton.setAttribute("default", "true");
        noButton.focus();
        break;
    case labels[2]:
        dialog.setAttribute('defaultButton', 'cancel');
        yesButton.removeAttribute("default");
        cancelButton.setAttribute("default", true);
        cancelButton.focus();
        break;
    default:
        //XXX Is this the kind of error handling we want to do in onload
        //    handlers?
        var msg = "Internal Error: illegal default 'response' for "
                  +"Yes/No/Cancel dialog: '"+response+"'.";
        log.error(msg);
        alert(msg);
        window.close();
    }

    // .text
    if (typeof window.arguments[0].text != "undefined" &&
        window.arguments[0].text != null) {
        var textWidget = document.getElementById("text");
        textWidget.removeAttribute("collapsed");
        textWidget.value = window.arguments[0].text;
    }

    // .title
    if (typeof window.arguments[0].title != "undefined" &&
        window.arguments[0].title != null) {
        document.title = window.arguments[0].title;
    } else {
        document.title = "Komodo";
    }

    // .doNotAskUI
    if (typeof window.arguments[0].doNotAskUI != "undefined" &&
        window.arguments[0].doNotAskUI != null) {
        gDoNotAskUI = window.arguments[0].doNotAskUI;
    }
    if (gDoNotAskUI) {
        document.getElementById("doNotAsk-checkbox")
                .removeAttribute("collapsed");
    }

    // .helpTopic
    if (window.arguments[0].helpTopic) {
        var helpButton = dialog.getButton("help");
        helpButton.removeAttribute("hidden");
        helpButton.removeAttribute("disabled");
        gHelpTopic = window.arguments[0].helpTopic;
    }

    window.sizeToContent();
    if (opener.innerHeight == 0) { // indicator that opener hasn't loaded yet
        dialog.centerWindowOnScreen();
    } else {
        dialog.moveToAlertPosition(); // requires a loaded opener
    }
    window.getAttention();
}


function Yes()
{
    window.arguments[0].response = 'Yes';
    if (gDoNotAskUI) {
        var checkbox = document.getElementById("doNotAsk-checkbox");
        window.arguments[0].doNotAsk = checkbox.checked;
    }
    return true;
}

function No()
{
    window.arguments[0].response = 'No';
    if (gDoNotAskUI) {
        var checkbox = document.getElementById("doNotAsk-checkbox");
        window.arguments[0].doNotAsk = checkbox.checked;
    }
    // "No" is one of the "extra" <dialog/> button. Only the "accept" and
    // "cancel" button actions will autoamtically close the window, so we have
    // to do it manually here.
    window.close();
    return true;
}

function Cancel()
{
    window.arguments[0].response = 'Cancel';
    if (gDoNotAskUI) {
        // Don't skip this dialog next time, if it was cancelled this time.
        window.arguments[0].doNotAsk = false;
    }
    return true;
}

function Help()
{
    ko.windowManager.getMainWindow().ko.help.open(gHelpTopic);
    return true;
}


