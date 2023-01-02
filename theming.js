const Me = imports.misc.extensionUtils.getCurrentExtension();
const Constants = Me.imports.constants;
const {Clutter, Gio, GLib, St} = imports.gi;

Gio._promisify(Gio.File.prototype, 'replace_contents_bytes_async', 'replace_contents_finish');
Gio._promisify(Gio.File.prototype, 'create_async');
Gio._promisify(Gio.File.prototype, 'make_directory_async');
Gio._promisify(Gio.File.prototype, 'delete_async');

function getStylesheetFiles(){
    const directoryPath = GLib.build_filenamev([GLib.get_home_dir(), ".local/share/arcmenu"]);
    const stylesheetPath = GLib.build_filenamev([directoryPath, "stylesheet.css"]);

    const directory = Gio.File.new_for_path(directoryPath);
    const stylesheet = Gio.File.new_for_path(stylesheetPath);

    return [directory, stylesheet];
}

async function createStylesheet(settings){
    try {
        const [directory, stylesheet] = getStylesheetFiles();

        if(!directory.query_exists(null))
            await directory.make_directory_async(0, null);
        if(!stylesheet.query_exists(null))
            await stylesheet.create_async(Gio.FileCreateFlags.NONE, 0, null);

        Me.customStylesheet = stylesheet;
        updateStylesheet(settings);
    } catch (e) {
        log(`ArcMenu - Error creating custom stylesheet: ${e}`);
    }
}

function unloadStylesheet(){
    if(!Me.customStylesheet)
        return;

    let theme = St.ThemeContext.get_for_stage(global.stage).get_theme();
    theme.unload_stylesheet(Me.customStylesheet);
}

async function deleteStylesheet(){
    unloadStylesheet();

    try {
        const [directory, stylesheet] = getStylesheetFiles();

        if(stylesheet.query_exists(null))
            await stylesheet.delete_async(0, null);
        if(directory.query_exists(null))
            await directory.delete_async(0, null);

    } catch (e) {
        if (!e.matches(Gio.IOErrorEnum, Gio.IOErrorEnum.NOT_FOUND))
            log(`ArcMenu - Error deleting custom stylesheet: ${e}`);
    }
}

async function updateStylesheet(settings){
    let stylesheet = Me.customStylesheet;

    if(!stylesheet){
        log("ArcMenu - Warning: Custom stylesheet not found! Unable to set contents of custom stylesheet.");
        return;
    }

    unloadStylesheet();

    let customMenuThemeCSS = ``;
    let extraStylingCSS = ``;

    let menuBGColor = settings.get_string('menu-background-color');
    let menuFGColor = settings.get_string('menu-foreground-color');
    let menuBorderColor = settings.get_string('menu-border-color');
    let menuBorderWidth = settings.get_int('menu-border-width');
    let menuBorderRadius = settings.get_int('menu-border-radius');
    let menuFontSize = settings.get_int('menu-font-size');
    let menuSeparatorColor = settings.get_string('menu-separator-color');
    let itemHoverBGColor = settings.get_string('menu-item-hover-bg-color');
    let itemHoverFGColor = settings.get_string('menu-item-hover-fg-color');
    let itemActiveBGColor = settings.get_string('menu-item-active-bg-color');
    let itemActiveFGColor = settings.get_string('menu-item-active-fg-color');

    let [menuRise, menuRiseValue] = settings.get_value('menu-arrow-rise').deep_unpack();

    let [buttonFG, buttonFGColor] = settings.get_value('menu-button-fg-color').deep_unpack();
    let [buttonHoverBG, buttonHoverBGColor] = settings.get_value('menu-button-hover-bg-color').deep_unpack();
    let [buttonHoverFG, buttonHoverFGColor] = settings.get_value('menu-button-hover-fg-color').deep_unpack();
    let [buttonActiveBG, buttonActiveBGColor] = settings.get_value('menu-button-active-bg-color').deep_unpack();
    let [buttonActiveFG, buttonActiveFGColor] = settings.get_value('menu-button-active-fg-color').deep_unpack();
    let [buttonRadius, buttonRadiusValue] = settings.get_value('menu-button-border-radius').deep_unpack();
    let [buttonWidth, buttonWidthValue] = settings.get_value('menu-button-border-width').deep_unpack();
    let [buttonBorder, buttonBorderColor] = settings.get_value('menu-button-border-color').deep_unpack();
    let [searchBorder, searchBorderValue] = settings.get_value('search-entry-border-radius').deep_unpack();

    if(buttonFG){
        extraStylingCSS += `.arcmenu-menu-button{
                                color: ${buttonFGColor};
                            }`;
    }
    if(buttonHoverBG){
        extraStylingCSS += `.arcmenu-panel-menu:hover{
                                box-shadow: inset 0 0 0 100px transparent;
                                background-color: ${buttonHoverBGColor};
                            }`;
    }
    if(buttonHoverFG){
        extraStylingCSS += `.arcmenu-panel-menu:hover .arcmenu-menu-button{
                                color: ${buttonHoverFGColor};
                            }`
    }
    if(buttonActiveFG){
        extraStylingCSS += `.arcmenu-menu-button:active{
                                color: ${buttonActiveFGColor};
                            }`;
    }
    if(buttonActiveBG){
        extraStylingCSS += `.arcmenu-panel-menu:active{
                                box-shadow: inset 0 0 0 100px transparent;
                                background-color: ${buttonActiveBGColor};
                            }`;
    }
    if(buttonRadius){
        extraStylingCSS += `.arcmenu-panel-menu{
                                border-radius: ${buttonRadiusValue}px;
                            }`;
    }
    if(buttonWidth){
        extraStylingCSS += `.arcmenu-panel-menu{
                                border-width: ${buttonWidthValue}px;
                            }`;
    }
    if(buttonBorder){
        extraStylingCSS += `.arcmenu-panel-menu{
                                border-color: ${buttonBorderColor};
                            }`;
    }
    if(menuRise){
        extraStylingCSS += `.arcmenu-menu{
                                -arrow-rise: ${menuRiseValue}px;
                            }`;
    }
    if(searchBorder){
        extraStylingCSS += `#ArcMenuSearchEntry{
                                border-radius: ${searchBorderValue}px;
                            }`;
    }

    if(settings.get_boolean('override-menu-theme')){
        customMenuThemeCSS = `
        .arcmenu-menu{
            font-size: ${menuFontSize}pt;
            color: ${menuFGColor};
        }
       .arcmenu-menu .popup-menu-content {
            background-color: ${menuBGColor};
            border-color: ${menuBorderColor};
            border-width: ${menuBorderWidth}px;
            border-radius: ${menuBorderRadius}px;
        }
        .arcmenu-menu StButton {
            color: ${menuFGColor};
            background-color: ${menuBGColor};
            border-width: 0px;
            box-shadow: none;
            border-radius: 8px;
        }
        .arcmenu-menu .popup-menu-item:focus, .arcmenu-menu .popup-menu-item:hover,
        .arcmenu-menu .popup-menu-item:checked, .arcmenu-menu .popup-menu-item.selected,
        .arcmenu-menu StButton:focus, .arcmenu-menu StButton:hover, .arcmenu-menu StButton:checked {
            color: ${itemHoverFGColor};
            background-color: ${itemHoverBGColor};
        }
        .arcmenu-menu .popup-menu-item:active, .arcmenu-menu StButton:active {
            color: ${itemActiveFGColor};
            background-color: ${itemActiveBGColor};
        }
        .arcmenu-menu .popup-menu-item:insensitive{
            color: ${modifyColorLuminance(menuFGColor, 0, 0.6)};
            font-size: ${menuFontSize - 2}pt;
        }
        .arcmenu-menu .world-clocks-header, .arcmenu-menu .world-clocks-timezone,
        .arcmenu-menu .weather-header{
            color: ${modifyColorLuminance(menuFGColor, 0, 0.6)};
        }
        .arcmenu-menu .world-clocks-time, .arcmenu-menu .world-clocks-city{
            color: ${menuFGColor};
        }
        .arcmenu-menu .weather-forecast-time{
            color: ${modifyColorLuminance(menuFGColor, -0.1)};
        }
        .arcmenu-menu .popup-separator-menu-item .popup-separator-menu-item-separator{
            background-color: ${menuSeparatorColor};
        }
        .arcmenu-menu .popup-separator-menu-item StLabel{
            color: ${menuFGColor};
        }
        .separator-color-style{
            background-color: ${menuSeparatorColor};
        }
        .arcmenu-menu StEntry{
            font-size: ${menuFontSize}pt;
            border-color: ${modifyColorLuminance(menuSeparatorColor, 0, .1)};
            color: ${menuFGColor};
            background-color: ${modifyColorLuminance(menuBGColor, -0.1, .4)};
        }
        .arcmenu-menu StEntry:hover{
            border-color: ${itemHoverBGColor};
            background-color: ${modifyColorLuminance(menuBGColor, -0.15, .4)};
        }
        .arcmenu-menu StEntry:focus{
            border-color: ${itemActiveBGColor};
            background-color: ${modifyColorLuminance(menuBGColor, -0.2, .4)};
        }
        .arcmenu-menu StLabel.hint-text{
            color: ${modifyColorLuminance(menuFGColor, 0, 0.6)};
        }
        .arcmenu-custom-tooltip{
            font-size: ${menuFontSize}pt;
            color: ${menuFGColor};
            background-color: ${modifyColorLuminance(menuBGColor, 0.05, 1)};
        }
        .arcmenu-small-button:hover{
            box-shadow: inset 0 0 0 100px ${modifyColorLuminance(itemHoverBGColor, -0.1)};
        }
        .arcmenu-menu .user-icon{
            border-color: ${modifyColorLuminance(menuFGColor, 0, .7)};
        }
        `;
    }

    const customStylesheetCSS = customMenuThemeCSS + extraStylingCSS;

    if(customStylesheetCSS.length === 0)
        return;

    try{
        let bytes = new GLib.Bytes(customStylesheetCSS);

        const [success, _etag] = await stylesheet.replace_contents_bytes_async(bytes, null, false, Gio.FileCreateFlags.REPLACE_DESTINATION, null);

        if(!success){
            log("ArcMenu - Failed to replace contents of custom stylesheet.");
            return;
        }

        Me.customStylesheet = stylesheet;
        let theme = St.ThemeContext.get_for_stage(global.stage).get_theme();
        theme.load_stylesheet(Me.customStylesheet);
    }
    catch(e){
        log(`ArcMenu - Error replacing contents of custom stylesheet: ${e}`);
    }
}

function modifyColorLuminance(colorString, luminanceFactor, overrideAlpha){
    let color = Clutter.color_from_string(colorString)[1];
    let [hue, lum, sat] = color.to_hls();
    let modifiedLum;

    if(luminanceFactor === 0)
        modifiedLum = lum;
    else if(lum >= .85) //if lum is too light, force darken
        modifiedLum = Math.min((1 - Math.abs(luminanceFactor)) * lum, 1);
    else if(lum <= .15) //if lum is too dark, force lighten
        modifiedLum = Math.max((1 - Math.abs(luminanceFactor)) * lum, 0);
    else if(luminanceFactor >= 0) //otherwise, darken or lighten based on luminanceFactor
        modifiedLum = Math.min((1 + luminanceFactor) * lum, 1);
    else
        modifiedLum = Math.max((1 + luminanceFactor) * lum, 0);

    let alpha = (color.alpha / 255).toPrecision(3);
    if(overrideAlpha)
        alpha = overrideAlpha;

    let modifiedColor = Clutter.color_from_hls(hue, modifiedLum, sat);

    return `rgba(${modifiedColor.red}, ${modifiedColor.green}, ${modifiedColor.blue}, ${alpha})`
}
