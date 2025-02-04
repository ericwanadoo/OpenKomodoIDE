// Copyright (c) 2000-2010 ActiveState Software Inc.
// See the file LICENSE.txt for licensing information.

var filterPrefs, globalPrefs, placePrefs;
var filterPrefValues = {};
var widgets = {};
var currentFilterName;
var prefsToDelete = [];
var g_ResultObj;

var log = ko.logging.getLogger("manageViewFilters");
var _bundle = Components.classes["@mozilla.org/intl/stringbundle;1"]
    .getService(Components.interfaces.nsIStringBundleService)
    .createBundle("chrome://komodo-places/locale/places.properties");
const CURRENT_PROJECT_FILTER_NAME = _bundle.GetStringFromName("currentProject.filterName");
    
function onLoad() {
    try { wrapOnLoad(); } catch(ex) { dump(ex + "\n"); }
}
function wrapOnLoad() {
    // dump("** onLoad...\n");
    g_ResultObj = window.arguments[0];
    widgets.configNameMenu = document.getElementById("filter-configuration");
    widgets.configNameMenu.removeAllItems();
    widgets.exclude_matches = document.getElementById("exclude_matches");
    widgets.include_matches = document.getElementById("include_matches");
    widgets.deleteButton = document.getElementById("deleteButton");
        
    globalPrefs = (Components.classes["@activestate.com/koPrefService;1"].
                   getService(Components.interfaces.koIPrefService).prefs);
    placePrefs = globalPrefs.getPref("places");
    filterPrefs = placePrefs.getPref("filters");
    var prefNames = filterPrefs.getPrefIds();
    var defaultName = _bundle.GetStringFromName("default.filterName");
    prefNames.map(function(prefName) {
        var filter = filterPrefs.getPref(prefName);
        filterPrefValues[prefName] = {
            exclude_matches: filter.getStringPref("exclude_matches"),
            include_matches: filter.getStringPref("include_matches"),
            readonly:     filter.getBooleanPref("readonly"),
            dirty:            false,
            isNew:            false,
            __EOF_:           null // allow comma on last real item.
        };
        if (prefName == CURRENT_PROJECT_FILTER_NAME &&
            opener.ko.projects.manager.currentProject) {
            // Re-synchronize with project prefs. This is necessary because
            // project filters are stored in project files while places filters
            // are stored in the user's preferences file.
            // TODO: ideally project filter pref strings would sync up with
            // filter pref strings, and this 'if' block wouldn't be necessary.
            var projectPrefs = opener.ko.projects.manager.currentProject.prefset;
            filterPrefValues[prefName].exclude_matches = projectPrefs.getStringPref("import_exclude_matches");
            filterPrefValues[prefName].include_matches = projectPrefs.getStringPref("import_include_matches");
        }
        if (filter.hasPref("builtin")
            && filter.getBooleanPref("builtin")
            && prefName == _bundle.GetStringFromName("currentProject.filterName")
            && !opener.ko.projects.manager.currentProject) {
            // Don't add the currentProject filter.
            delete filterPrefValues[prefName];
        } else {
            widgets.configNameMenu.appendItem(prefName, prefName);
        }
    });
    currentFilterName = (g_ResultObj.currentFilterName
                         || widgets.configNameMenu.childNodes[0].childNodes[0].label);
    var currentFilter = filterPrefValues[currentFilterName];
    setup_widgets(currentFilter);
    var currentViewName = g_ResultObj.currentFilterName;
    var elts = widgets.configNameMenu.
        getElementsByAttribute("value", currentViewName);
    if (elts.length == 1) {
        widgets.configNameMenu.value = currentViewName;
    } else {
        widgets.configNameMenu.selectedIndex = 0;
    }
    doChangeFilter(widgets.configNameMenu);
}

function setup_widgets(filter) {
    widgets.exclude_matches.value = filter.exclude_matches;
    widgets.include_matches.value = filter.include_matches;
    var status = filter.readonly;
    widgets.deleteButton.disabled = status;
    if (status) {
        widgets.exclude_matches.setAttribute("readonly", status);
        widgets.include_matches.setAttribute("readonly", status);
    } else {
        widgets.exclude_matches.removeAttribute("readonly");
        widgets.include_matches.removeAttribute("readonly");
    }
}

function doChangeFilter(target) {
    try { wrap_doChangeFilter(target) } catch(ex) { dump(ex + "\n")}
}

function wrap_doChangeFilter(target) {
    var newFilterName = target.value;
    if (newFilterName == currentFilterName) {
        //dump("no change\n");
        return;
    } else if (!(newFilterName in filterPrefValues)) {
        ko.dialogs.alert("Internal error: Can't find filter '" + newFilterName + "'");
        return;
    }
    var oldFilter = grabCurrentWidgetValues(currentFilterName);
    if (oldFilter.dirty) {
        var prompt = _bundle.formatStringFromName('saveChangesToChangedFilters.format',
                                                  [currentFilterName], 1);
        var res = opener.ko.dialogs.yesNoCancel(prompt, "Yes");
        if (res == "Cancel") {
            return;
        } else if (res == "Yes") {
            prefSet = filterPrefs.getPref(currentFilterName);
            prefSet.setStringPref("exclude_matches", oldFilter.exclude_matches);
            prefSet.setStringPref("include_matches", oldFilter.include_matches);
            prefSet.setLongPref("version", g_ResultObj.version);
        }
    }
    var i = 0;
    var newFilter = filterPrefValues[currentFilterName = newFilterName];
    setup_widgets(newFilter);
    for (var name in filterPrefValues) {
        if (name == newFilterName) {
            widgets.configNameMenu.selectedIndex = i;
            break;
        }
        i++;
    }
    //dump("Leaving doChangeFilter\n");
}

function doSaveNewFilter() {
    try { wrap_doSaveNewFilter(); } catch(ex) { dump(ex+ "\n")}
}
function wrap_doSaveNewFilter() {
    var newName;
    var msg = _bundle.formatStringFromName('enterNewFilterName.format',
                                           [currentFilterName], 1);
    while (true) {
        newName = ko.dialogs.prompt(msg, "Filter Name", "", "Filter Name");
        if (!newName) {
            return;
        } else if (newName in filterPrefValues || filterPrefs.hasPref(newName)) {
            msg = _bundle.formatStringFromName('filterNameExists.format',
                                                   [newName], 1);
        } else {
            break;
        }
    }
    var oldFilter = grabCurrentWidgetValues(currentFilterName);
    var newFilter = {
        exclude_matches: oldFilter.exclude_matches,
        include_matches: oldFilter.include_matches,
        readonly:         false,
        dirty:            true,
        isNew:            true,
        __EOF_:           null // allow comma on last real item.
    };
    currentFilterName = newName;
    filterPrefValues[currentFilterName] = newFilter;
    setup_widgets(newFilter);
    var newMenuItem = widgets.configNameMenu.appendItem(currentFilterName, currentFilterName)
    widgets.configNameMenu.selectedItem = newMenuItem;
}

function doDeleteFilter() {
    try { wrap_doDeleteFilter(); } catch(ex) { dump(ex+ "\n")}
}
function wrap_doDeleteFilter() {
    // Move up one, unless it's the first, and then move down one.
    prefsToDelete.push(currentFilterName);
    filterPrefs.deletePref(currentFilterName);
    delete filterPrefValues[currentFilterName];
    var index = widgets.configNameMenu.selectedIndex;
    widgets.configNameMenu.removeItemAt(index);
    if (index >= widgets.configNameMenu.itemCount) {
        index = widgets.configNameMenu.itemCount - 1;
    }
    widgets.configNameMenu.selectedIndex = index;
    currentFilterName = widgets.configNameMenu.value;
    setup_widgets(filterPrefValues[currentFilterName]);
}

function grabCurrentWidgetValues(filterName) {
    var filter = filterPrefValues[filterName];
    var items = {
        exclude_matches: null,
        include_matches: null };
    for (var prefName in items) {
        //dump("grabCurrentWidgetValues: prefName(1): [" + prefName + "]\n");
        filter[prefName] = widgets[prefName].value;
    }
    if (!filter.readonly && !filter.isNew) {
        // Did it change?
        var oldPref = filterPrefs.getPref(filterName);
        if (filterName == CURRENT_PROJECT_FILTER_NAME) {
            // Ensure synchronization. This is necessary because project filters
            // are stored in project files while places filters are stored in
            // the user's preferences file.
            // TODO: ideally filterPrefs.getPref(filterName) would return the
            // project prefset so this 'if' block wouldn't be necessary.
            oldPref = opener.ko.projects.manager.currentProject.prefset;
        }
        for (var prefName in items) {
            //dump("grabCurrentWidgetValues: prefName(2): [" + prefName + "]\n");
            if (filterName != CURRENT_PROJECT_FILTER_NAME) {
                if (widgets[prefName].value != oldPref.getStringPref(prefName)) {
                    //dump("val " + prefName + " changed\n");
                    filter.dirty = true;
                }
            } else {
                // TODO: ideally project filter pref strings would sync up with
                // filter pref strings, and this 'if-else' block wouldn't be
                // necessary. See synchronization note above.
                if (widgets[prefName].value != oldPref.getStringPref("import_" + prefName)) {
                    filter.dirty = true;
                }
            }
        }
    }
    return filter;
}

function OK() {
    //dump("OK...\n");
    try {
        wrap_OK();
    } catch(ex) {
        dump(ex + "\n");
    }
}
function wrap_OK() {
    var madeChange = false;
    var currentFilter = grabCurrentWidgetValues(currentFilterName);
    var prefSet = null;
    var isNew = false;
    if (currentFilter.dirty) {
        if (!currentFilter.isNew) {
            try {
                prefSet = filterPrefs.getPref(currentFilterName);
            } catch(ex) {
                dump(ex + "\n");
                log.exception(ex);
            }
        }
        if (!prefSet) {
            var prefSet = Components.classes["@activestate.com/koPreferenceSet;1"].createInstance();
            isNew = true;
        }
        prefSet.setStringPref("exclude_matches", currentFilter.exclude_matches);
        prefSet.setStringPref("include_matches", currentFilter.include_matches);
        prefSet.setBooleanPref("readonly", false);
        prefSet.setLongPref("version", g_ResultObj.version);
        if (isNew) {
            filterPrefs.setPref(currentFilterName, prefSet);
        } else if (currentFilterName == CURRENT_PROJECT_FILTER_NAME) {
            try {
                var projectPrefs = opener.ko.projects.manager.currentProject.prefset;
                projectPrefs.setStringPref("import_exclude_matches", currentFilter.exclude_matches);
                projectPrefs.setStringPref("import_include_matches", currentFilter.include_matches);
            } catch(ex) {
                log.exception("manageViewFilters.js: wrap_OK: Can't set proj prefs: " + ex + "\n");
            }
        }
                
        madeChange = true;
    }
    prefsToDelete.map(function(filterName) {
        filterPrefs.deletePref(filterName);
    });
    //if (madeChange) {
    //    placePrefs.setPref("filters", filterPrefs);
    //}
    if (!madeChange && g_ResultObj.currentFilterName != currentFilterName) {
        madeChange = true;
    }
    if (madeChange) {
        g_ResultObj.needsChange = madeChange;
        g_ResultObj.currentFilterName = currentFilterName;
    }
    return true;
}

function Cancel() {
    // Nothing to do
    return true;
}
