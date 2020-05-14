/**
 * cobe.js (The COde BEautifier)
 * 
 * Copyright 2018 - today 
 * Author: s0nda
 * 
 * Sources:
 * https://developer.mozilla.org/de/docs/Web/JavaScript/Guide/Regular_Expressions
 * https://developer.mozilla.org/de/docs/Web/JavaScript/Reference/Global_Objects/RegExp
 * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp/sticky
 * https://developer.mozilla.org/de/docs/Web/JavaScript/Reference/Global_Objects/String/replace
 */

var _this = (typeof window !== 'undefined') ? window : {};

/*
 * COBE (COde BEautifier)
 */
var COBE = (function (_this) {
    //
    // Define new String function(s)
    //
    if ( typeof String.prototype.replaceAt === 'undefined' ) {
        String.prototype.replaceAt = function (substr, newsubstr, index) {
            return this.substring(0, index) + newsubstr + this.substring(index + substr.length);
        };
    }
    if ( typeof String.prototype.escapeHTML == 'undefined' ) { // escape special signs
        String.prototype.escapeHTML = function () {
            return (
                this.replace(/<\/.*>(?![^ ])/g, "") // Negated Lookahead x(?:y): 
                                                    //    Match any pattern </.*> (e.g. </stdio.h>, </string>) only if it is NOT followed 
                                                    //    by [^ ] (i.e. any special character like \r,\n,\t etc. that is NOT empty).
                                                    //    In anderen Worten, match jedes Muster, das vor \r,\n,\t etc. steht.
                    .replace(/>/g, "&gt;")  // '>' is replaced by &gt;
                    .replace(/</g, "&lt;")  // '<' is replaced by &lt;
            );
        };
    }
    //
    // Collections of keywords in code
    //
    const DEFAULT_TYPES = "unsigned|byte|char|int|float|double|void|const|static";
    const DEFAULT_KEYWORDS = "function|public|private|class|if|then|else|fi|elif|for|do|while|done|break|continue|return|switch|case|in|default";
    const DEFAULT_DIRECTIVES = "#pseudoA|#include|#ifdef|#ifndef|#define|#endif|#!/bin/bash|#pseudoB"; // Workaround: Must add "pseudoA" at beginning and "#pseudoB" at the end. Otherwise, the first (#include) and last (#endif) directive will not be recognized.";
    //
    // RegExp for keywords (types, control-keywords, directives) in code
    //
    const DEFAULT_REGEX_TYPES = "\\b(" + DEFAULT_TYPES + ")\\b[ ]+(\\*)?"; // double-backslash (\\) to escape the start (*)
    const DEFAULT_REGEX_KEYWORDS = "\\b(" + DEFAULT_KEYWORDS + ")\\b(?=[ ]*.*(;|:|((\\r?\\n|\\r)?{|})))"
                                +  "|^[ ]*(" + DEFAULT_KEYWORDS + ")$"
                                + "|;[ ]+(" + DEFAULT_KEYWORDS + ")"; // Bash syntax: <while> ... ; <do>
    const DEFAULT_REGEX_DIRECTIVES = "\\b" + DEFAULT_DIRECTIVES + "\\b(?=.*(\\r?\\n|\\r))";
    //
    // RegExp for code comments. Support single- and multiple-line comments as follows:
    // (0)  #
    // (1)  # <comment>
    // (2)  // <comment>
    // (3)  /* <comment> */
    // (4)  /*
    //       * <comments> multiple-line
    //       */
    //
    // The regular expressions (in Literal Notation /regexp/g) for (0), (1), (2), (3), (4) respectively are:
    // (0)  #[ ]*(\r?\n|\r)
    // (1)  #[ ]+.*[ ]*(\r?\n|\r)?
    // (2)  \/\/[ ]*.*[ ]*(\r?\n|\r)?  <== The special sign (slash '/') must be escaped with backslash ('\') to '\/'.
    // (3)  \/\*[ ]*.*[ ]*\*\/        <== The special sign (start '*') must be escaped with backslash ('\') to '\*'.
    // (4)  \/\*([ ]*.*[ ]*(\r?\n|\r)[ ]*\*)+\*?\/(\r?\n|\r)
    //
    // The 5 regular expressions above are combined by OR ('|') operator. Moreover, global ('g') flag is used.
    //
    const DEFAULT_REGEX_COMMENTS = /#[ ]*(\r?\n|\r)|#[ ]+.*[ ]*(\r?\n|\r)?|\/\/[ ]*.*[ ]*(\r?\n|\r)?|\/\*[ ]*.*[ ]*\*\/|\/\*([ ]*.*[ ]*(\r?\n|\r)[ ]*\*)+\*?\/(\r?\n|\r)/g; // Line-feed / Carriage-return: \r\n (Win/DOS), \r (older Macs), \n (Linux/Unix)
    //
    // CSS seletor(s)
    //
    const DEFAULT_CSS_SELECTOR_CODE_BLOCKS = "div.cobe";
    //
    // CSS styles for code blocks, keywords etc.
    //
    const DEFAULT_CSS_STYLE = {
        FONT : "font-size: 14px; font-weight: normal; font-style: normal;"
             + "font-family: Consolas, Menlo , Monaco, 'Lucida Console', 'Liberation Mono', 'DejaVu Sans Mono', 'Bitstream Vera Sans Mono', 'Courier New', monospace, 'sans-serif';",
        PARENT : "display: inline-block; width: 100%;", // style for <div> parent, that contains the <pre> code block
        CHILD_NUMBER   : "overflow-x: scroll; float:left; text-align: right; padding-left: 8px; padding-right: 8px; padding-top: 8px; padding-bottom: 9px;", // syle for left child (<div>) for numbering lines, <flex-grow> <flex-shrink> <flex-basis with unit>
        CHILD_PRE_CODE : "overflow-x: scroll; padding-left: 14px; padding-right: 8px; padding-top: 8px; padding-bottom: 9px; " // style for right child (<pre>) for code
    };
    //
    // Array of code blocks. Every single block (div.cobe) is an element in array.
    //
    let blocks = [];
    //
    // Reference object for window.COBE
    //
    let _ = {
        //
        // Themes for appearence
        //
        themes : {}, // object (undefined)
        //
        // Active theme
        //
        active_theme : null, // object (null)
        /*
         * init
         *
         * Description: Initialize values
         */
        init : function () {
            blocks = document.querySelectorAll(DEFAULT_CSS_SELECTOR_CODE_BLOCKS) || [];
            if ( blocks.length == 0 ) {
                return;
            }
            //
            // Set active theme
            //
            if ( !this.active_theme ) {
                this.active_theme = this.themes["DARK"]; // "this" refers to "_" == "_this.COBE" == "window.COBE"
            }
            //
            // Start making code pretty
            //
            this.beautify();
        }, // END (init)
        /*
         * set_theme
         *
         * Description: Set the (static) active theme for COBE
         */
        set_theme : function (theme_name) {
            this.active_theme = this.themes[theme_name];
        }, // END (set_theme)
        /*
         * switch_theme
         *
         * Description: Dynamically switch current theme for COBE
         */
        switch_theme : function (theme_name) {
            this.set_theme(theme_name);
            blocks.forEach (block => {
                block.querySelector("div").style = DEFAULT_CSS_STYLE.FONT + DEFAULT_CSS_STYLE.CHILD_NUMBER + this.active_theme.BACKGROUND + this.active_theme.NUMBER_COLOR + this.active_theme.NUMBER_BACKGROUND;
                block.querySelector("pre").style = DEFAULT_CSS_STYLE.FONT + DEFAULT_CSS_STYLE.CHILD_PRE_CODE + this.active_theme.BACKGROUND + this.active_theme.FONT_COLOR;
            });
        }, // END (switch_theme)
        /*
         * match_count
         *
         * Description: Return the number of matches when using "String.prototype.match(regex)"
         * 
         * @params:
         *      str
         *      regex
         * 
         * @return:
         *      Number of matches found
         */
        match_count : function (str, regex) {
            return ( (str || "").match(regex) /* The empty string "" protect this function from crash if match(reg) returns null */
                     || [] /* The [] protects this function from crash if str.match(reg) returns null */
                    ).length;
        }, // END (match_count);
        /*
         * format_indents
         *
         * Description: Format line indents (Bearbeitung der Zeileneinrückungen).
         *      An indent (at the beginning of a line) may be tabulator(s) (\t, \x09), empty space(s) ([ ]) or white space(s) (\s).
         *      This function recognizes and do format all of them.
         * For example: Given the following code inside a <pre> block:
         *
         * <pre>
         * ____#include <stdio.h>
         * ____int main (int argc, char * argv[]) {
         * ________printf("Hello World!\n");
         * ________return 0;
         * ____}
         * </pre>
         *
         * The function "format_indents()" will detect all indents in every line. In the above <pre> block,
         * we see there are 2 kinds of indents. The first (1) kind is 4 spaces long (____). The second (2) kind
         * is 8 spaces long (________). Then, the function will determine the minimum of them, in this case
         * the minimum is (1) with 4 spaces => min := 4. For lines with indent (1) of 4 spaces (____), we simply
         * remove all indents => 4 - 4 = 0 space. For lines with indent (2) of 8 spaces (________), we remove 4
         * of them => 8 - min = 8 - 4 = 4 spaces.
         *
         * On web page, the code with formatted indents will look as follows:
         *
         * #include <stdio.h>
         * int main (int argc, char * argv[]) {
         * ____printf("Hello World!\n");
         * ____return 0;
         * }
         * 
         * @params:
         *      array: String array containing the code lines
         *
         * @return:
         *      Array of code lines the indents of which are formatted
         */
        format_indents : function (array) {
            //
            let lines = array;
            //
            // Search for the white spaces (\t or \x09 (tabulators), \s or [ ] (empty spaces)) in the beginning of line (line indents).
            //
            let mint = 25, // (default) number of tabulator (\t, \x09) in the beginning of line. Then, determine the smallest of these numbers (minimum).
                mins = 25; // (default) number of white spaces (\s) in the beginning of line. Then, determine the smallest of these numbers (minimum).
                            // Note that an \s also contains \n,\t,[ ] etc.
            let counts = {
                tabus : [], // this array contains the number of tabulators (\tab) in beginning of each line.
                spaces : []  // this array contains the number of (empty) spaces, but not \tab, in beginning of each line
            }
            lines.forEach( (line, line_index) => { // Iterate through every single line
                let zeile = line.trimEnd(); // single line
                if (zeile.trimStart()) { // if (line.trim() !== "")  <== not empty string
                    //
                    // Match all tabulators (\t, \x09) in the beginning of line.
                    // g: (global flag) match all, set RegEx.lastIndex = 0 (first index)
                    // y: (sticky flag) match only from starting position given in property RegEx.lastIndex
                    // URL: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp/sticky
                    // in this case (use only sticky flag 'y'), RegEx.lastIndex should be 0 (first index). Thus, the regex will search for match
                    // from the beginning of line; if found, only the first match is returned. Not all matches. But with the 'g' flag, it will
                    // search for all matches in the given string.
                    //let rex = /\t/y; rex.lastIndex = 0; // set RegEx.lastIndex to 0. That is the first position to begin searching for match.
                    //const ct = COBE.match_count(zeile, /\t/y);
                    const ct = COBE.match_count(zeile, /\t/gy); // short form: combine 'global' (g) and 'sticky' flag (y), since 'g' sets lastIndex = 0 first, then 'g' is ignored and 'y' is started.
                    //
                    // Match all white spaces (\s) in the beginning of line. Similar to the above case with tabulators (\t).
                    // Then subtract <ct> from "COBE.match_count(zeile, /\s/gy)", because an \s corresponds to \n,\t,[ ] etc.
                    //let rex = /\s/y; rex.lastIndex = 0; // set RegEx.lastIndex to 0. That is the first position to begin searching for match.
                    //const cs = COBE.match_count(zeile, /\s/y) - ct;
                    const cs = COBE.match_count(zeile, /\s/gy) - ct; // short form: combine 'global' (g) and 'sticky' flag (y), since 'g' sets lastIndex = 0 first, then 'g' is ignored and 'y' is started.
                    //
                    // Add values to arrays
                    counts.tabus.push(ct);
                    counts.spaces.push(cs);
                    //
                    // Update minimum value (in a single line).
                    if (ct < mint) { mint = ct; }
                    if (cs < mins) { mins = cs; }
                }
                else { // if line is empty, then push zero (0) to the arrays respectively => zero tabulator
                    counts.tabus.push(0);
                    counts.spaces.push(0);
                }
            });
            //
            // Process lines with (overfilled) \tabs
            //
            for (let i = 0; i < lines.length; i++) {
                let line = lines[i].trim(); // remove all white spaces (\t,\r,\n,\f, etc.) in beginning and end of line.
                if (line) { // if trimmed line is not empty.
                    lines[i] = line; // remove all white spaces (\t,\r,\n,\f, etc.) in beginning and end of line.
                    // Replace 1x \t (tabulator) by 4x dot spaces
                    for (let j = 0; j < (counts.tabus[i]-mint); j++) { // Reduziert die Anzahl von \t (tabulators) auf ein Minimum "mint"
                        lines[i] = "    " + lines[i]; // 1x \t (tabulator) = 4x dot spaces
                    }
                    // Replace 1x dot space also by 1x dot space
                    for (let j = 0; j < (counts.spaces[i]-mins); j++) {
                        lines[i] = " " + lines[i];
                    }
                }
            }
            //
            return lines;
        }, // END (format_indents)
        /*
         * format_keywords
         *
         * Description: Detect and format keywords (control, types) and directives in every code line
         *
         * For "RegExp Object", to escape the special characters (e.g. star (*)) in string, use the double-backslash (\\) => for example: \\*
         *
         *      Literal notation        |       RexExp Object string        |       Meaning
         *  ============================+===================================+===========================================================
         *          \b                  |           "\\b"                   |   Wortgrenze
         *          \s                  |           "\\s"                   |   White space (empty space, \n, \t, etc...)
         *          \/                  |           "/"                     |   A normal slash "/"
         *          \/\/                |           "//"                    |   Double-slashes for comments, e.g. "// <comments>"
         *          \*                  |           "\\*"                   |   The star (*) sign for comments, e.g. "/* <comments 
         *          \(                  |           "\\("                   |   The left parenthese "("
         *          \)                  |           "\\)"                   |   The right parenthese ")"
         *
         * Use the "Lookahead Assertion" : "x(?=y)"
         * @params:
         *      array: String array containing the code lines
         * 
         * @return:
         *      Array of code lines the keywords of which are formatted
         */
        format_keywords : function (array) {
            //
            let lines = array;
            //
            for (let i = 0; i < lines.length; i++) {
                let _line = lines[i];
                let index_comment = _line.search(/(\/\/|\*|#[ ]+).*/); // index of the first occurence of the <comment> pattern like "// <comment>" or "/* <comment> */" or "# <comment>"
                if (index_comment != -1) { // lines[i] contains comment (/* <comment> */ or // <comment>)
                    //
                    // Detect and format type-keywords
                    //
                    let regex = new RegExp(DEFAULT_REGEX_TYPES, "g"); // RegExp object (for types-keyword) => slower than RegExp Literal Notation "/../i" where flag "i" is for ignoring case-sensitive
                    if ( !lines[i].match(/[ ]*#[a-zA-Z0-9_!/]/) ) { // lines[i] has no preprocessor directives starting with "#"
                        let _zeile = _line;
                        let _array = null;
                        let _offset = 0;
                        const _newLength = ("<span style='" + this.active_theme.TYPES + "'></span>").length;
                        while ( (_array = regex.exec(_line)) ) { // search for type-keyword in lines[i]. Each match is stored in _array[0].
                            if (index_comment >= _array.index) { // keyword (_array[0]) is outside of comment => color keyword
                                _zeile = _zeile.replaceAt(_array[0], "<span style='" + this.active_theme.TYPES + "'>" + _array[0] + "</span>", _array.index + _offset);
                                _offset += _newLength;
                            }
                            else { // keyword (_array[0]) may be inside comment, e.g. "//<comment> keyword <comment>" or "/* <comment> keyword <comment> */"
                                let _tmp  = null;
                                if (_line.charAt(index_comment) === "*" && _line.charAt(index_comment-1) !== "/") { // <comment> is not of kind: "/* <comment>..."
                                    _tmp = /\/\*/.exec(_line); // search for match like "/* <comment>" (beginning of comment)
                                    let _ics = -1; // index comment start with "/* <comment>"
                                    let _ice = -1; // index comment end with "<comment> */"
                                    if (_tmp) { // there is comment of form "/* <comment>" in current line
                                        _ics = _tmp.index;
                                        _tmp = /\*\//.exec(_line); // search for match like "<comment> */" (end of comment)
                                        if (_tmp) { // there is comment of form "<comment> */" in current line
                                            _ice = _tmp.index;
                                            if ( ! (_ics < _line.indexOf(_array[0]) && _line.indexOf(_array[0]) < _ice) ) { // if keyword _array[0] is NOT inside comment " type-keyword /* <comment */ type-keyword ".
                                                _zeile = _zeile.replaceAt(_array[0], "<span style='" + this.active_theme.TYPES + "'>" + _array[0] + "</span>", _array.index + _offset);
                                                _offset += _newLength;
                                            }
                                        }
                                        else {
                                            _zeile = _zeile.replaceAt(_array[0], "<span style='" + this.active_theme.TYPES + "'>" + _array[0] + "</span>", _array.index + _offset);
                                            _offset += _newLength;
                                        }
                                    }
                                    else { // there is NO comment of form "/* <comment>" in current line, but only of the form "* <comment>"
                                        _tmp = /\/\//.exec(_line); // search for match like "// <comment>"
                                        if (_tmp) { // there is comment of form "// <comment>" in current line
                                            if ( _line.indexOf(_array[0]) < _tmp.index ) { // keyword _array[0] is NOT inside comment of the form: "// <comment>"
                                                _zeile = _zeile.replaceAt(_array[0], "<span style='" + this.active_theme.TYPES + "'>" + _array[0] + "</span>", _array.index + _offset);
                                                _offset += _newLength;
                                            }
                                        }
                                        else { // there is NO comment of form "// <comment>" in current line, but only of the form "* <comment>"
                                            if ( !_line.match(/^[ ]*\*/g) ) {
                                                _zeile = _zeile.replaceAt(_array[0], "<span style='" + this.active_theme.TYPES + "'>" + _array[0] + "</span>", _array.index + _offset);
                                                _offset += _newLength;
                                            }
                                        }
                                    }
                                }
                                else { // comment is of kind "/* <comment>..."
                                    if (_array) {
                                        if (_line.substring(_array.index-6, _array.index + _array[0].length+1).search(new RegExp("\\*\\/[ ]*" + _array[0], "g")) != -1) {
                                            _zeile = _zeile.replaceAt(_array[0], "<span style='" + this.active_theme.TYPES + "'>" + _array[0] + "</span>", _array.index + _offset);
                                            _offset += _newLength;
                                        }
                                    }
                                }
                            }
                        }
                        _line = _zeile;
                    }
                    //
                    // Detect and format control-keywords
                    //
                    regex = new RegExp(DEFAULT_REGEX_KEYWORDS, "gi"); // RegExp object (for keywords) => slower than RegExp Literal Notation "/../i" where flag "i" is for ignoring case-sensitive
                    let _index_comment = _line.search(/(\/\/|\*|#[ ]+.*).*/); // index of the first occurence of the <comment> pattern like "// <comment>" or "/* <comment> */" or "# <comment>"
                    if ( !lines[i].match(/[ ]*#[a-zA-Z0-9_!/]/) ) { // lines[i] has no preprocessor directives starting with "#"
                        _zeile = _line;
                        _array = null;
                        _offset = 0;
                        const _newLength_ = ("<span style='" + this.active_theme.KEYWORDS + "'></span>").length;
                        while ( (_array = regex.exec(_line)) ) {
                            if (_index_comment >= _array.index) { // keyword (_array[0]) is outside of comment => color keyword
                                _zeile = _zeile.replaceAt(_array[0], "<span style='" + this.active_theme.KEYWORDS + "'>" + _array[0] + "</span>", _array.index + _offset);
                                _offset += _newLength_;
                            }
                        }
                        _line = _zeile;
                    }
                    //
                    // Detect and format directive-keywords
                    //
                    regex = new RegExp(DEFAULT_REGEX_DIRECTIVES, "gi"); // RegExp object (for preprocessor directives)
                    if (index_comment > lines[i].search(regex)) { // directives is outside of comment => color directive
                        _line = _line.replace(regex, (match) => {
                            return "<span style='" + this.active_theme.DIRECTIVES + "'>" + match + "</span>";
                        });
                    }
                    //
                    // Detect and format function-keywords
                    //
                    _index_comment = _line.search(/(\/\/|\*|#[ ]+.*).*/); // index of the first occurence of the <comment> pattern like "// <comment>" or "/* <comment> */" or "# <comment>"
                    regex = /\b\w+\b(?=[ ]*\()/gi; // RegExp for function keywords like: "func(" or "func ("
                    if ( !lines[i].match(/[ ]*#[a-zA-Z0-9_!/]/) ) { // lines[i] has no preprocessor directives starting with "#"
                        _zeile = _line;
                        _array = null;
                        _offset = 0;
                        const _newLength_ = ("<span style='" + this.active_theme.FUNCTIONS + "'></span>").length;
                        while ( (_array = regex.exec(_line)) ) {
                            if (_index_comment >= _array.index) { // keyword (_array[0]) is outside of comment => color keyword
                                let _matc = lines[i].match(/["'].+["']/); // match() returns an array of matches; otherwise null. Search pattern is a string with quotes like "<string".
                                if ( !_matc ) { // _matc == null
                                    _zeile = _zeile.replaceAt(_array[0], "<span style='" + this.active_theme.FUNCTIONS + "'>" + _array[0] + "</span>", _array.index + _offset);
                                    _offset += _newLength_;
                                }
                                else { //_matc != null
                                    let _string = _matc[0];
                                    if (_string.indexOf(_array[0]) != -1) { // keyword (_array[0]) is inside a string "<string>"
                                        if (_string.match(new RegExp("\\+[ ]*" + _array[0] + "\\([^(]*\\)[ ]*\\+"))) { // string concaternation: "<string>" + func_keyword(x,y) + "<string>"
                                            _zeile = _zeile.replaceAt(_array[0], "<span style='" + this.active_theme.FUNCTIONS + "'>" + _array[0] + "</span>", _array.index + _offset);
                                            _offset += _newLength_;
                                        }
                                    }
                                    else {
                                        _zeile = _zeile.replaceAt(_array[0], "<span style='" + this.active_theme.FUNCTIONS + "'>" + _array[0] + "</span>", _array.index + _offset);
                                        _offset += _newLength_;
                                    }
                                }
                            }
                            else { // keyword (_array[0]) is inside of comment
                                if (_line.charAt(_index_comment) === "*" && _line.charAt(_index_comment-1) !== "/") {
                                    if (_line.substring(0, _index_comment).match(/\w/)) { // not comment line
                                        _zeile = _zeile.replaceAt(_array[0], "<span style='" + this.active_theme.FUNCTIONS + "'>" + _array[0] + "</span>", _array.index + _offset);
                                        _offset += _newLength_;
                                    }
                                }
                            }
                            break;
                        }
                        _line = _zeile;
                    }
                    lines[i] = _line;
                }
                else { // if lines[i] has no comment
                    if ( !lines[i].match(/.*#[a-zA-Z0-9_!/]/) ) { // lines[i] has no preprocessor directives starting with "#" (e.g. #include<stdio.h>), but comment like "# <comments>"
                        //
                        // Detect and format type-keywords
                        //
                        regex = new RegExp(DEFAULT_REGEX_TYPES, "gi"); // RegExp object (for keywords) => slower than RegExp Literal Notation "/../i" where flag "i" is for ignoring case-sensitive
                        lines[i] = lines[i].replace(regex, (match) => {
                            return "<span style='" + this.active_theme.TYPES + "'>" + match + "</span>";
                        });
                        //
                        // Detect and format control-keywords
                        //
                        regex = new RegExp(DEFAULT_REGEX_KEYWORDS, "gi"); // RegExp object (for keywords) => slower than RegExp Literal Notation "/../i" where flag "i" is for ignoring case-sensitive
                        lines[i] = lines[i].replace(regex, (match) => {
                            let semicolon = "";
                            if (match[0] == ";") {
                                semicolon = ";"; match = match.substring(1);
                            }
                            return semicolon + "<span style='" + this.active_theme.KEYWORDS + "'>" + match + "</span>";
                        });
                        //
                        // Detect and format function-keywords
                        //
                        _array = /["']/g.exec(_line);
                        lines[i] = lines[i].replace(/\b\w+\b(?=[ ]*\()/gi, (match) => {
                            if (_array) {
                                if (_line.substring(_array.index+ 1, match).indexOf("\"") == -1) {
                                    return "<span style='" + this.active_theme.FUNCTIONS + "'>" + match + "</span>";
                                }
                            }
                            else {
                                return "<span style='" + this.active_theme.FUNCTIONS + "'>" + match + "</span>";
                            }
                        });
                    }
                    else {
                        //
                        // Detect and format directive-keywords
                        //
                        regex = new RegExp(DEFAULT_REGEX_DIRECTIVES, "i"); // RegExp object (for preprocessor directives)
                        lines[i] = lines[i].replace(regex, (match) => {
                            return "<span style='" + this.active_theme.DIRECTIVES + "'>" + match + "</span>";
                        });
                    }
                }
            }
            //
            return lines;
        }, // END (format_keywords)
        /*
         * beautify
         *
         * Description: [Main program] Format and make the code pretty
         * 
         */
        beautify : function () {
            for (let i = 0; i < blocks.length; i++) {
                //
                // Get content of block. Escape special signs (characters).
                //
                let code = blocks[i].innerHTML.escapeHTML();
                blocks[i].innerHTML = "";
                //
                // Create a new <div> element for numbering code lines
                //
                let _div = document.createElement("DIV");
                //
                // Create a new <pre> element for holding code
                //
                let _pre = document.createElement("PRE");
                //
                // Append newly created elements to parent
                //
                blocks[i].appendChild(_div);
                blocks[i].appendChild(_pre);
                //
                // Split content (text) line-by-line separated by delimiter \n, \r\n, \r (line-feed, new-line).
                //
                let regex = /\r?\n|\r/g; // Literal Notation (for \newline, \linefeed)
                                         //   => Faster than RegExp-constructor: new RegExp("regex", "flag")
                                         //   => Line-feed / Carriage-return: \r\n (Win/DOS), \r (older Macs), \n (Linux/Unix)
                let lines = code.split(regex);
                //
                // Search for and format the indents (tabulator(s) (\t, \x09), white/empty space(s) (\s, [ ]) in the beginning of line.
                //
                lines = this.format_indents(lines);
                //
                // Detect and format keywords (control, types) and directives in every code line
                //
                lines = this.format_keywords(lines);
                //
                // Eliminate empty line(s)
                //
                if (lines[0] === "") {  // if first line is empty
                    lines.shift(); // remove first line
                }
                if ( lines[lines.length-1].match(/\w/gi) == null ) { // if last line doesn't contain any alphanumerical word (\w)
                    lines.pop(); // remove last line
                }
                //
                // Join all lines to complete code.
                //
                code = lines.join("\r\n");
                //
                // Format comments in code
                //
                code = code.replace(DEFAULT_REGEX_COMMENTS, (match, p, offset, string) => {
                    return "<span style='" + this.active_theme.COMMENTS + "'>" + match + "</span>";
                });
                //
                // Apply CSS style to number-block(s) and code-block(s)
                //
                blocks[i].style = DEFAULT_CSS_STYLE.PARENT;
                _div.style = DEFAULT_CSS_STYLE.FONT + DEFAULT_CSS_STYLE.CHILD_NUMBER + this.active_theme.BACKGROUND + this.active_theme.NUMBER_COLOR + this.active_theme.NUMBER_BACKGROUND;
                _pre.style = DEFAULT_CSS_STYLE.FONT + DEFAULT_CSS_STYLE.CHILD_PRE_CODE + this.active_theme.BACKGROUND + this.active_theme.FONT_COLOR;
                //
                // Assign formatted code to block
                //
                _pre.innerHTML = code;
                //
                // Numbering the code lines / Write numbers in number-block(s)
                //
                for (let j = 1; j <= lines.length; j++) { _div.innerHTML += j + "<br />"; }
            }
        }, // END (beautify)
    }; // END (_)
    //
    // Assign properties object to COBE
    //
    _this.COBE = _; // window.COBE = _
    //
    // Provide COBE instance with all properties
    //
    return _;
})(_this);
//
// Note: Arrow function loses its own bindings to 'this', 'arguments', 'super' or 'new.target'
//
document.addEventListener("DOMContentLoaded", () => COBE.init(), false);
//
// Add new themes for COBE
//
COBE.themes.DARK = {
    BACKGROUND : "background: #2E3436;",
    FONT_COLOR : "color: #fff;",
    NUMBER_BACKGROUND: "background: #494949;",
    NUMBER_COLOR: "color: #c0b9b7;",
    COMMENTS : "color: #33ff46;",
    TYPES : "color: #4198ef;",
    KEYWORDS : "color: #f99df2;",
    DIRECTIVES : "color: #fcb246;",
    FUNCTIONS : "color: #fcfc81;"
};
COBE.themes.DARK_RETRO = {
    BACKGROUND : "background-color: #0f2027; background: #0f2027;" /* fallback for old browsers */
                + "background: -webkit-linear-gradient(to right, #0f2027, #203a43, #2c5364);" /* Chrome 10-25, Safari 5.1-6 */
                + "background: linear-gradient(to right, #0f2027, #203a43, #2c5364);", /* W3C, IE 10+/ Edge, Firefox 16+, Chrome 26+, Opera 12+, Safari 7+ *///"background: #2E3436;",
    FONT_COLOR : "color: #fff;",
    NUMBER_BACKGROUND: "background: #2c5364;",
    NUMBER_COLOR: "color: #c0b9b7;",
    COMMENTS : "color: #33ff46;",
    TYPES : "color: #4198ef;",
    KEYWORDS : "color: #f99df2;",
    DIRECTIVES : "color: #fcb246;",
    FUNCTIONS : "color: #fcfc81;"
};
COBE.themes.PURPLE_RETRO = {
    BACKGROUND : "background: #41295a;" /* fallback for old browsers */
                + "background: -webkit-linear-gradient(to right, #2F0743, #41295a);" /* Chrome 10-25, Safari 5.1-6 */
                + "background: linear-gradient(to right, #2F0743, #41295a);", /* W3C, IE 10+/ Edge, Firefox 16+, Chrome 26+, Opera 12+, Safari 7+ */
    FONT_COLOR : "color: #fff;",
    NUMBER_BACKGROUND: "background: #67468a;",
    NUMBER_COLOR: "color: #c0b9b7;",
    COMMENTS : "color: #33ff46;",
    TYPES : "color: #4198ef;",
    KEYWORDS : "color: #fbff00;",
    DIRECTIVES : "color: #fcb246;",
    FUNCTIONS : "color: #fcfc81;"
};
//
// Set COBE active theme
//
COBE.set_theme("DARK_RETRO");
