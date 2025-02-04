#!python
# Copyright (c) 2001-2006 ActiveState Software Inc.
# See the file LICENSE.txt for licensing information.

"""Python-specific Language Services implementations."""

import os
import sys, re
import keyword
import cStringIO, StringIO  # cStringIO doesn't work well with unicode strings! 
import pprint
import tokenize
import token

import logging
from xpcom import components, ServerException
from koLanguageServiceBase import *
import sciutils



#---- globals

log = logging.getLogger("koPythonLanguage")
#log.setLevel(logging.DEBUG)


#---- Language Service component implementations

class KoPythonCommonLexerLanguageService(KoLexerLanguageService):
    
    def __init__(self):
        KoLexerLanguageService.__init__(self)
        self.setLexer(components.interfaces.ISciMoz.SCLEX_PYTHON)
        self.setProperty('tab.timmy.whinge.level', '1') # XXX make a user-accesible pref
        self.setProperty('lexer.python.keywords2.no.sub.identifiers', '1')
        self.setProperty('fold.quotes.python', '1')
        # read lexPython.cxx to understand the meaning of the levels.
        self.supportsFolding = 1

class KoPythonLexerLanguageService(KoPythonCommonLexerLanguageService):
    def __init__(self):
        KoPythonCommonLexerLanguageService.__init__(self)
        kwlist = set(keyword.kwlist)
        kwlist2 = set(['False', 'None', 'True', 'as', 'self',
                       ## built-in functions
                       'abs', 'all', 'any', 'apply', 'basestring', 'bin',
                       'bool', 'buffer', 'bytearray', 'bytes', 'callable',
                       'chr', 'classmethod', 'cmp', 'coerce', 'compile',
                       'complex', 'copyright', 'credits', 'delattr', 'dict',
                       'dir', 'divmod', 'enumerate', 'eval', 'execfile', 'exit',
                       'file', 'filter', 'float', 'format', 'frozenset',
                       'getattr', 'globals', 'hasattr', 'hash', 'help', 'hex',
                       'id', 'input', 'int', 'intern', 'isinstance',
                       'issubclass', 'iter', 'len', 'license', 'list', 'locals',
                       'long', 'map', 'max', 'memoryview', 'min', 'next',
                       'object', 'oct', 'open', 'ord', 'pow', 'print',
                       'property', 'quit', 'range', 'raw_input', 'reduce',
                       'reload', 'repr', 'reversed', 'round', 'set', 'setattr',
                       'slice', 'sorted', 'staticmethod', 'str', 'sum', 'super',
                       'tuple', 'type', 'unichr', 'unicode', 'vars', 'xrange',
                       'zip', '__import__']
                    )
        self.setKeywords(0, list(kwlist))
        self.setKeywords(1, list(kwlist2))

class KoPython3LexerLanguageService(KoPythonCommonLexerLanguageService):
    def __init__(self):
        KoPythonCommonLexerLanguageService.__init__(self)
        kwlist = set(['and', 'as', 'assert', 'break',
                      'class', 'continue', 'def', 'del', 'elif', 'else',
                      'except', 'finally', 'for', 'from', 'global', 'if',
                      'import', 'in', 'is', 'lambda', 'nonlocal', 'not', 'or',
                      'pass', 'raise', 'return', 'try', 'while', 'with', 'yield',
                      # New in 3.5
                      'async', 'await']
                     )
        kwlist2 = set(['False', 'None', 'True', 'self',
                       ## built-in functions
                       'abs', 'all', 'any', 'ascii', 'bin', 'bool', 'bytearray',
                       'bytes', 'callable', 'chr', 'classmethod', 'compile',
                       'complex', 'delattr', 'dict', 'dir', 'divmod',
                       'enumerate', 'eval', 'exec', 'exit', 'filter', 'float',
                       'format', 'frozenset', 'getattr', 'globals', 'hasattr',
                       'hash', 'help', 'hex', 'id', 'input', 'int',
                       'isinstance', 'issubclass', 'iter', 'len', 'list',
                       'locals', 'map', 'max', 'memoryview', 'min', 'next',
                       'object', 'oct', 'open', 'ord', 'pow', 'print',
                       'property', 'quit', 'range', 'repr', 'reversed', 'round',
                       'set', 'setattr', 'slice', 'sorted', 'staticmethod',
                       'str', 'sum', 'super', 'tuple', 'type', 'vars', 'zip',
                       '__import__'] )
        self.setKeywords(0, list(kwlist))
        self.setKeywords(1, list(kwlist2))


class KoPythonCommonLanguage(KoLanguageBase):
    namedBlockRE = "^[ \t]*?(def\s+[^\(]+\([^\)]*?\):|class\s+[^:]*?:)"
    namedBlockDescription = 'Python functions and classes'
    # XXX read url from some config file
    downloadURL = 'http://www.activestate.com/activepython'
    commentDelimiterInfo = { "line": [ "# ", "#" ]  }
    _indent_open_chars = ':{[('
    _lineup_open_chars = "([{" 
    _lineup_close_chars = ")]}"
    _dedenting_statements = [u'raise', u'return', u'pass', u'break', u'continue']
    supportsSmartIndent = "python"
    importPref = "pythonExtraPaths"
    sample = """import math
class Class:
    \"\"\" this is a docstring \"\"\"
    def __init__(self, arg): # one line comment
        self.x = arg + math.cos(arg + arg)
        s = 'a string'
"""

    styleStdin = sci_constants.SCE_P_STDIN
    styleStdout = sci_constants.SCE_P_STDOUT
    styleStderr = sci_constants.SCE_P_STDERR

    def __init__(self):
        KoLanguageBase.__init__(self)
        # Classes that want to define their own variable styles need to
        # let the base class initialize the style info first, and then
        # fill in the details this way.
        self._style_info._variable_styles = [sci_constants.SCE_P_IDENTIFIER]
        self.matchingSoftChars["`"] = ("`", self.softchar_accept_matching_backquote)
        self._fastCharData = \
            FastCharData(trigger_char=";",
                         style_list=(sci_constants.SCE_P_OPERATOR,
                                     sci_constants.SCE_UDL_SSL_OPERATOR,),
                         skippable_chars_by_style={ sci_constants.SCE_P_OPERATOR : "])",
                                                    sci_constants.SCE_UDL_SSL_OPERATOR : "])",})

    def getVariableStyles(self):
        return self._style_info._variable_styles

    def get_interpreter(self):
        if self._interpreter is None:
            self._interpreter =\
                components.classes["@activestate.com/koAppInfoEx?app=%s;1"
                                   % self.name]\
                .getService(components.interfaces.koIAppInfoEx)
        return self._interpreter

    def _keyPressed(self, ch, scimoz, style_info):
	res = self._handledKeyPressed(ch, scimoz, style_info)
	if not res:
	    KoLanguageBase._keyPressed(self, ch, scimoz, style_info)

    _slidingKeywords = ('else', 'elif', 'except', 'finally')
    _firstWordRE = re.compile(r'(\s+)(\w+)')
    def _handledKeyPressed(self, ch, scimoz, style_info):
	"""
	If the user types an operator ":" at the end of the line,
	and the line starts with one of
    	    else elif except finally
	and it has the same indent as the previous non-empty line,
	dedent it.	
	"""
	if ch != ":" or not self._dedentOnColon:
	    return False
	pos = scimoz.positionBefore(scimoz.currentPos)
        style = scimoz.getStyleAt(pos)
	ch_pos = scimoz.getWCharAt(pos)
        if style not in style_info._indent_open_styles:
	    return False
	lineNo = scimoz.lineFromPosition(pos)
	if lineNo == 0:
	    #log.debug("no point working on first line")
	    return False
	thisLinesIndent = scimoz.getLineIndentation(lineNo)
	prevLinesIndent = scimoz.getLineIndentation(lineNo - 1)
	if thisLinesIndent < prevLinesIndent:
	    #log.debug("current line %d is already dedented", lineNo)
	    return False
        lineStartPos = scimoz.positionFromLine(lineNo)
	if scimoz.getStyleAt(lineStartPos) != components.interfaces.ISciMoz.SCE_P_DEFAULT:
	    #log.debug("line %d doesn't start with a whitespace char", lineNo)
	    return False
        lineEndPos = scimoz.getLineEndPosition(lineNo)
	if lineEndPos <= lineStartPos + 1:
	    #log.debug("line %d too short", lineNo)
	    return False
	text = scimoz.getTextRange(lineStartPos, lineEndPos)
	m = self._firstWordRE.match(text)
	if not m or m.group(2) not in self._slidingKeywords:
	    return False
	leadingWS = m.group(1)
	tabFreeLeadingWS = leadingWS.expandtabs(scimoz.tabWidth)
	currWidth = len(tabFreeLeadingWS)
	indent = scimoz.indent
	if not indent:
		indent = scimoz.tabWidth # if 0, Scintilla uses tabWidth
	targetWidth = currWidth - indent
	if targetWidth < 0:
	    fixedLeadingWS = ""
	else:
	    fixedLeadingWS = scimozindent.makeIndentFromWidth(scimoz, targetWidth)
	scimoz.targetStart = lineStartPos
	scimoz.targetEnd = lineStartPos + len(leadingWS)
	scimoz.replaceTarget(len(fixedLeadingWS), fixedLeadingWS)
	return True

    def _atOpeningStringDelimiter(self, scimoz, pos, style_info):
        #Walk backwards looking for three quotes, an optional
        #leading r or u, and an opener.
        # If we only have one quote, it's a single-line string.
        if pos < 6:
            return False
        # Look for a delim after the q-part
        prevPos = scimoz.positionBefore(pos)
        prevStyle = scimoz.getStyleAt(prevPos)
        if prevStyle not in style_info._string_styles:
            return False
        quoteChar = scimoz.getWCharAt(prevPos)
        if quoteChar not in "\'\"":
            return False

        # Allow for two more quoteChars before
        for i in range(2):
            prevPos = scimoz.positionBefore(prevPos)
            prevStyle = scimoz.getStyleAt(prevPos)
            if prevStyle not in style_info._string_styles:
                return False
            prevChar = scimoz.getWCharAt(prevPos)
            if prevChar != quoteChar:
                return False
            
        prevPos = scimoz.positionBefore(prevPos)
        prevStyle = scimoz.getStyleAt(prevPos)
        # Look for an 'r' or 'u' before three quotes
        if prevStyle in style_info._string_styles:
            prevChar = scimoz.getWCharAt(prevPos)
            if prevChar not in "ru":
                return False
            prevPos = scimoz.positionBefore(prevPos)
            
        return self._atOpeningIndenter(scimoz, prevPos, style_info)
        
    def _shouldIndent(self, scimoz, pos, style_info):
        """
        Determines whether or not the next line should be indented.
        Python's autoindentation should kick in on ':{[('. However, autoindent
        after ':' needs a second check because dictionary associations like
        `key: [1, 2, 3],` can cause a miscalculation since parenthetical
        statements are "skipped". For example, while `key: [1, 2, 3],` is
        correctly ignored, a parenthetical skip also checks `key: `, which would
        incorrectly trigger autoindent.
        Note: the parenthetical skip is needed for multi-line statements like
            foo = (bar and
                   baz)
        in order to restore indentation to the `foo =` line.
        This method is identical to its superclass method except for an
        additional check when an indenting character is found.
        @param scimoz The Scintilla editor object.
        @param pos The current buffer position (typically at the end of a line).
        @param style_info The object that represents the current theme's styling
            information.
        @return a new indentation level or None to retain the current level
        """
        curLineNo = scimoz.lineFromPosition(pos)
        lineStart = scimoz.positionFromLine(curLineNo)
        data = scimoz.getStyledText(lineStart, pos+1)
        for p in range(pos-1, lineStart-1, -1):
            char = data[(p-lineStart)*2]
            style = ord(data[(p-lineStart)*2+1])
            #indentlog.debug("char = %s, style = %d", char, style)
            #indentlog.debug("indent_open_chars = %r, indent_open_styles = %r", self._indent_open_chars, style_info._indent_open_styles)
            if style in style_info._comment_styles:
                indentlog.debug("skipping comment character")
                continue
            elif char in ' \t':
                continue
            elif (char in self._indent_open_chars and
                  style in style_info._indent_open_styles):
                if char == ':' and data[-2] in self._indent_open_chars:
                    break
                return KoLanguageBase._findIndentationBasedOnStartOfLogicalStatement(self, scimoz, pos, style_info, curLineNo)
            break
        return None

    def test_scimoz(self, scimoz):
        CommenterTestCase.lang = self
        testCases = [
            CommenterTestCase,
        ]
        sciutils.runSciMozTests(testCases, scimoz)

class KoPythonLanguage(KoPythonCommonLanguage):
    name = "Python"
    _reg_desc_ = "%s Language" % (name)
    _reg_contractid_ = "@activestate.com/koLanguage?language=%s;1" \
                       % (name)
    _reg_clsid_ = "{D90FF5C7-1FD4-4535-A0D2-47B5BDC3E7FE}"
    _reg_categories_ = [("komodo-language", name)]

    accessKey = 'y'
    primary = 1
    defaultExtension = ".py"
    shebangPatterns = [
        re.compile(ur'\A#!.*python(?!3).*$', re.IGNORECASE | re.MULTILINE),
    ]

    def get_lexer(self):
        if self._lexer is None:
            self._lexer = KoPythonLexerLanguageService()
        return self._lexer

class KoPython3Language(KoPythonCommonLanguage):
    name = "Python3"
    _reg_desc_ = "%s Language" % (name)
    _reg_contractid_ = "@activestate.com/koLanguage?language=%s;1" \
                       % (name)
    _reg_clsid_ = "{db8d60b3-f104-4622-b4d5-3324787d5149}"
    _reg_categories_ = [("komodo-language", name)]

    accessKey = '3'
    primary = 1
    defaultExtension = ".py"
    shebangPatterns = [
        re.compile(ur'\A#!.*python3.*$', re.IGNORECASE | re.MULTILINE),
    ]

    importPref = "python3ExtraPaths"

    def get_lexer(self):
        if self._lexer is None:
            self._lexer = KoPython3LexerLanguageService()
        return self._lexer


#---- test suites
#
# Run via "Test | SciMoz Tests" in a Komodo dev build.
#

class CommenterTestCase(sciutils.SciMozTestCase):
    """Test Python auto-(un)commenting."""
    # Set in test_scimoz() driver to the koPythonLanguage instance.
    lang = None

    def test_simple(self):
        self.assertAutocommentResultsIn(self.lang,
            "foo<|>bar",
            "#foo<|>bar")
        self.assertAutouncommentResultsIn(self.lang,
            "#foo<|>bar",
            "foo<|>bar")

    def test_non_ascii_issues(self):
        self.assertAutocommentResultsIn(self.lang,
            u"foo \xe9 bar<|>",
            u"#foo \xe9 bar<|>")
        self.assertAutouncommentResultsIn(self.lang,
            u"#foo \xe9 bar<|>",
            u"foo \xe9 bar<|>")


