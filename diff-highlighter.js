// Generated by CoffeeScript 1.6.2
(function() {
  var DiffProcessor, File, HtmlLineSplitter, HtmlTag, Line, LineMerger, TagStack, diffProcessor, dropNonexisting, logMessages, longestCommonPrefix, notEmpty, style, unique,
    __slice = [].slice,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

  logMessages = function() {
    var messages;

    messages = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
    return console.log.apply(console, ['[GitHub diff highlighter]'].concat(__slice.call(messages)));
  };

  longestCommonPrefix = function() {
    var combinePrefix, firstString, i, prefix, string, strings, _i, _j, _len, _ref, _ref1,
      _this = this;

    strings = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
    prefix = [];
    firstString = strings[0];
    combinePrefix = function() {
      return prefix.join('');
    };
    if (strings.length < 2) {
      return combinePrefix();
    }
    for (i = _i = 0, _ref = firstString.length; 0 <= _ref ? _i < _ref : _i > _ref; i = 0 <= _ref ? ++_i : --_i) {
      _ref1 = strings.slice(1);
      for (_j = 0, _len = _ref1.length; _j < _len; _j++) {
        string = _ref1[_j];
        if (string[i] !== firstString[i]) {
          return combinePrefix();
        }
      }
      prefix.push(firstString[i]);
    }
    return combinePrefix();
  };

  dropNonexisting = function(array) {
    var element;

    return ((function() {
      var _i, _len, _results;

      _results = [];
      for (_i = 0, _len = array.length; _i < _len; _i++) {
        element = array[_i];
        if (element != null) {
          _results.push(element);
        }
      }
      return _results;
    })()) || [];
  };

  notEmpty = function(array) {
    if (array.length > 0) {
      return array;
    } else {
      return null;
    }
  };

  unique = function(array) {
    return array.filter(function(value, index, self) {
      return self.indexOf(value) === index;
    });
  };

  HtmlTag = (function() {
    var tagTypeRegex;

    tagTypeRegex = /<(\/?)\s*(\w+).*?(\/?)\w*>/;

    function HtmlTag(tag) {
      var match;

      this.tag = tag;
      match = tagTypeRegex.exec(this.tag);
      this.isClosing = (match[1] || null) != null;
      this.tagType = match[2].toLowerCase();
      this.isSelfContained = (match[3] || null) != null;
    }

    HtmlTag.prototype.isClosingTag = function() {
      return this.isClosing;
    };

    HtmlTag.prototype.isOpeningTag = function() {
      return !this.isClosingTag() && !this.isSelfContained;
    };

    HtmlTag.prototype.canClose = function(otherTag) {
      return this.tagType === otherTag.tagType;
    };

    HtmlTag.prototype.getText = function() {
      return this.tag;
    };

    HtmlTag.prototype.getClosingTagText = function() {
      return "</" + this.tagType + ">";
    };

    return HtmlTag;

  })();

  TagStack = (function() {
    function TagStack() {
      this.tagStack = [];
    }

    TagStack.prototype.addTag = function(tag) {
      var openingTag;

      if (tag.isClosingTag()) {
        openingTag = this.tagStack.pop();
        if (!(tag.canClose(openingTag) && openingTag.isOpeningTag())) {
          throw 'Tags do not match: ' + tag.tag + " cannot close " + openingTag.tag;
        }
      } else {
        return this.tagStack.push(tag);
      }
    };

    TagStack.prototype.addTagFromStack = function(tag, stack) {
      tag.fromStack = stack;
      return this.addTag(tag);
    };

    TagStack.prototype.calculateTagDepth = function(index) {
      return this.tagStack.length - index;
    };

    TagStack.prototype.getPrematurelyClosedTagsIndex = function(closingTag) {
      var i, tag, _i, _ref;

      if (closingTag.isClosingTag() && this.tagStack.length > 0) {
        _ref = this.tagStack;
        for (i = _i = _ref.length - 1; _i >= 0; i = _i += -1) {
          tag = _ref[i];
          if (closingTag.canClose(tag)) {
            return i;
          }
        }
      }
      return null;
    };

    TagStack.prototype.getPrematurelyClosedTagsFromIndex = function(index) {
      return this.tagStack.slice(index).reverse();
    };

    TagStack.prototype.getPrematurelyClosedTags = function(tag, notEarlyStack, earlyStack) {
      var earlyStackTagIndex, notEarlyStackTagIndex;

      if (tag.isClosingTag()) {
        earlyStackTagIndex = earlyStack.getPrematurelyClosedTagsIndex(tag);
        if (earlyStackTagIndex != null) {
          notEarlyStackTagIndex = notEarlyStack.getPrematurelyClosedTagsIndex(tag);
          if (notEarlyStackTagIndex != null) {
            if (earlyStack.calculateTagDepth(earlyStackTagIndex) >= notEarlyStack.calculateTagDepth(notEarlyStackTagIndex)) {
              return earlyStack.getPrematurelyClosedTagsFromIndex(earlyStackTagIndex);
            }
          }
        }
      }
      return [];
    };

    return TagStack;

  })();

  HtmlLineSplitter = (function() {
    function HtmlLineSplitter(line) {
      this.line = line;
      this.tagRegex = /(<[^>]*?>)|([^<]*)/g;
      this.advance();
    }

    HtmlLineSplitter.prototype.advance = function() {
      return this.top = this.tagRegex.exec(this.line);
    };

    HtmlLineSplitter.prototype.getContent = function() {
      return this.top[0] || null;
    };

    HtmlLineSplitter.prototype.setContent = function(content) {
      return this.top[0] = content;
    };

    HtmlLineSplitter.prototype.getTag = function() {
      return new HtmlTag(this.getContent());
    };

    HtmlLineSplitter.prototype.popContent = function(value) {
      value = this.getContent();
      this.advance();
      return value;
    };

    HtmlLineSplitter.prototype.isTag = function() {
      return (this.top[1] || null) != null;
    };

    HtmlLineSplitter.prototype.isText = function() {
      return (this.top[2] || null) != null;
    };

    HtmlLineSplitter.prototype.hasContent = function() {
      return this.getContent() != null;
    };

    HtmlLineSplitter.prototype.isClosingTag = function() {
      return this.isTag() && this.getContent().indexOf('/') !== -1;
    };

    HtmlLineSplitter.prototype.removeTextPrefix = function(prefix) {
      var previous;

      previous = this.getContent();
      if (previous.length === prefix.length) {
        return this.advance();
      } else {
        return this.setContent(previous.substr(prefix.length));
      }
    };

    return HtmlLineSplitter;

  })();

  LineMerger = (function() {
    function LineMerger(highlightedLine, diffLine) {
      this.highlighted = new HtmlLineSplitter(highlightedLine);
      this.diff = new HtmlLineSplitter(diffLine);
      this.highlightedStack = new TagStack();
      this.diffStack = new TagStack();
      this.output = [];
    }

    LineMerger.prototype.appendPopped = function(splitter) {
      return this.output.push(splitter.popContent());
    };

    LineMerger.prototype.mergeTextIntoOutput = function() {
      var prefix;

      prefix = longestCommonPrefix(this.highlighted.getContent(), this.diff.getContent());
      if (prefix.length > 0) {
        this.output.push(prefix);
        this.highlighted.removeTextPrefix(prefix);
        return this.diff.removeTextPrefix(prefix);
      } else {
        throw 'Could not find prefix:\n' + this.highlighted.getContent() + '\n' + this.diff.getContent() + '\n';
      }
    };

    LineMerger.prototype.mergeTagIntoOutput = function(splitter, stack) {
      var otherStack, prematurelyClosedTags, t, tag, _i, _j, _len, _len1, _results;

      otherStack = stack !== this.diffStack ? this.diffStack : this.highlightedStack;
      tag = splitter.getTag();
      prematurelyClosedTags = stack.getPrematurelyClosedTags(tag, stack, otherStack);
      stack.addTag(tag);
      for (_i = 0, _len = prematurelyClosedTags.length; _i < _len; _i++) {
        t = prematurelyClosedTags[_i];
        this.output.push(t.getClosingTagText());
      }
      if (tag.tagType === 'br') {
        splitter.popContent();
      } else {
        this.appendPopped(splitter);
      }
      _results = [];
      for (_j = 0, _len1 = prematurelyClosedTags.length; _j < _len1; _j++) {
        t = prematurelyClosedTags[_j];
        _results.push(this.output.push(t.getText()));
      }
      return _results;
    };

    LineMerger.prototype.combineIntoHtml = function() {
      while (this.highlighted.hasContent() || this.diff.hasContent()) {
        if (this.highlighted.isTag()) {
          this.mergeTagIntoOutput(this.highlighted, this.highlightedStack);
        } else if (this.diff.isTag()) {
          this.mergeTagIntoOutput(this.diff, this.diffStack);
        } else if (this.highlighted.isText() && this.diff.isText()) {
          this.mergeTextIntoOutput();
        } else if (this.highlighted.hasContent()) {
          this.appendPopped(this.highlighted);
        } else if (this.diff.hasContent()) {
          this.appendPopped(this.diff);
        }
      }
      return this.output.join('');
    };

    return LineMerger;

  })();

  File = (function() {
    function File(path) {
      this.path = path;
      this.lines = [];
    }

    File.prototype.storeLine = function(lineElement, line, lineNumber) {
      line = new Line(lineElement, line, lineNumber);
      this.lines[lineNumber] = line;
      return line;
    };

    File.prototype.storeDiffLine = function(lineElement, line, lineNumberPrevious, lineNumberCurrent) {
      var storedLine;

      storedLine = new Line(lineElement, line, lineNumberCurrent || lineNumberPrevious);
      storedLine.setIsDiff(lineNumberPrevious);
      this.lines.push(storedLine);
      return storedLine;
    };

    File.prototype.getLine = function(index) {
      return this.lines[index];
    };

    return File;

  })();

  Line = (function() {
    var nonBreakingSpaceRegex;

    nonBreakingSpaceRegex = /&nbsp;/g;

    function Line(lineElement, line, lineNumber) {
      this.lineElement = lineElement;
      this.line = line;
      this.lineNumber = lineNumber;
      this.diffMarker = '';
    }

    Line.prototype.setIsDiff = function(lineNumberPrevious) {
      this.lineNumberPrevious = lineNumberPrevious;
      this.line = this.line.replace(nonBreakingSpaceRegex, ' ');
      this.diffMarker = this.line.substr(0, 1);
      return this.line = this.line.substr(1);
    };

    Line.prototype.diffAdded = function() {
      return this.diffMarker === '+';
    };

    Line.prototype.diffRemoved = function() {
      return this.diffMarker === '-';
    };

    Line.prototype.diffUnchanged = function() {
      return !this.diffAdded() && !this.diffRemoved() && this.diffMarker !== '@';
    };

    return Line;

  })();

  DiffProcessor = (function() {
    var currentRepoPath, endsInShaRegex;

    currentRepoPath = window.location.pathname.match(/\/[^\/]*\/[^\/]*\//)[0];

    endsInShaRegex = /[0-9a-fA-F]{40}$/;

    function DiffProcessor() {
      this.bucketMultipleEvents = __bind(this.bucketMultipleEvents, this);
      this.refreshDataAndHighlight = __bind(this.refreshDataAndHighlight, this);      this.currentCommitIdentifier = this.getGuessAtCurrentCommitIdentifier();
      this.parentCommitIdentifiers = this.getParentCommitIdentifiers();
      this.changedFilePaths = this.getChangedFilePaths();
      this.inlineChangedFilePaths = this.getInlineChangedFilePaths();
      this.diffData = this.getRegularDiffData();
      this.inlineDiffData = this.getInlineDiffData();
      this.parentData = {};
      this.currentData = {};
      this.numPagesToFetchBeforeProcessing = (this.parentCommitIdentifiers.length + [this.currentCommitIdentifier].length) * this.changedFilePaths.length;
      this.registeredModifiedEventHandler = false;
    }

    DiffProcessor.prototype.getMergingBranchCommitIdentifier = function(index) {
      var element, _ref;

      element = document.querySelectorAll('#js-discussion-header .gh-header-meta span.commit-ref.current-branch span')[index] || document.querySelectorAll('.branch-name span.js-selectable-text')[index];
      return (_ref = element.innerText) != null ? _ref.trim() : void 0;
    };

    DiffProcessor.prototype.getGuessAtCurrentCommitIdentifier = function() {
      var result, _ref;

      result = this.getMergingBranchFromFromComment();
      result || (result = (_ref = document.body.querySelector('.commandbar input')) != null ? _ref.getAttribute('data-branch') : void 0);
      result || (result = document.body.innerHTML.match(/commit\/([a-f0-9]{40})/)[1]);
      return result || this.getMergingBranchCommitIdentifier(1);
    };

    DiffProcessor.prototype.getMergingBranchFromFromComment = function() {
      var result, _ref;

      return result = (_ref = /head sha1: &quot;([0-9a-fA-F]{40})&quot;/.exec(document.body.innerHTML)) != null ? _ref[1] : void 0;
    };

    DiffProcessor.prototype.getMergingBranchToFromComment = function() {
      var result, _ref;

      return result = (_ref = /base sha1: &quot;([0-9a-fA-F]{40})&quot;/.exec(document.body.innerHTML)) != null ? _ref[1] : void 0;
    };

    DiffProcessor.prototype.getMergingBranchTo = function() {
      return this.getMergingBranchToFromComment();
    };

    DiffProcessor.prototype.getMergingBranchFrom = function() {
      return this.getMergingBranchFromFromComment();
    };

    DiffProcessor.prototype.getParentCommitIdentifiers = function() {
      var e;

      return notEmpty(dropNonexisting([this.getMergingBranchTo()])) || notEmpty((function() {
        var _i, _len, _ref, _ref1, _results;

        _ref = document.querySelectorAll('.commit-meta .sha-block a.sha');
        _results = [];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          e = _ref[_i];
          _results.push((_ref1 = endsInShaRegex.exec(e.href)) != null ? _ref1[0] : void 0);
        }
        return _results;
      })()) || dropNonexisting([this.getMergingBranchCommitIdentifier(0)]);
    };

    DiffProcessor.prototype.getChangedFilePaths = function() {
      var changedFileLinks, link, path, _i, _len, _ref, _ref1, _results;

      changedFileLinks = document.querySelectorAll('.file .info span.js-selectable-text');
      _results = [];
      for (_i = 0, _len = changedFileLinks.length; _i < _len; _i++) {
        link = changedFileLinks[_i];
        path = link.innerText.trim();
        if (path.indexOf('→') !== -1) {
          path = (_ref = link.parentElement) != null ? (_ref1 = _ref.parentElement) != null ? _ref1.getAttribute('data-path') : void 0 : void 0;
        }
        _results.push(path);
      }
      return _results;
    };

    DiffProcessor.prototype.getInlineChangedFilePaths = function() {
      var e, _i, _len, _ref, _results;

      _ref = document.querySelectorAll('.inline-review-comment .box-header');
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        e = _ref[_i];
        _results.push(e.getAttribute('data-path'));
      }
      return _results;
    };

    DiffProcessor.prototype.getLinesToMerge = function(filePath, line) {
      var id;

      if (line.diffAdded() || line.diffUnchanged()) {
        return dropNonexisting([this.currentData[filePath].getLine(line.lineNumber)]);
      } else if (line.diffRemoved()) {
        return dropNonexisting((function() {
          var _i, _len, _ref, _ref1, _ref2, _results;

          _ref = this.parentCommitIdentifiers;
          _results = [];
          for (_i = 0, _len = _ref.length; _i < _len; _i++) {
            id = _ref[_i];
            _results.push((_ref1 = this.parentData[id]) != null ? (_ref2 = _ref1[filePath]) != null ? _ref2.getLine(line.lineNumberPrevious) : void 0 : void 0);
          }
          return _results;
        }).call(this));
      } else {
        return [];
      }
    };

    DiffProcessor.prototype.highlightWhenDataReady = function() {
      var _this = this;

      if (this.numPagesToFetchBeforeProcessing > 0) {
        return;
      }
      this.highlightDiffData(this.inlineDiffData);
      this.highlightDiffData(this.diffData);
      if (!this.registeredModifiedEventHandler) {
        this.registeredModifiedEventHandler = true;
        document.addEventListener('DOMNodeInserted', function() {
          return _this.bucketMultipleEvents(_this.refreshDataAndHighlight);
        }, false, true);
        return setTimeout(this.refreshDataAndHighlight, 2000);
      }
    };

    DiffProcessor.prototype.refreshDataAndHighlight = function() {
      this.diffData = this.getRegularDiffData();
      this.inlineDiffData = this.getInlineDiffData();
      return this.highlightWhenDataReady();
    };

    DiffProcessor.prototype.bucketMultipleEvents = function(callback) {
      var _this = this;

      this.changeLastTriggered = new Date();
      return setTimeout(function() {
        if ((new Date() - _this.changeLastTriggered) >= 100) {
          return callback();
        }
      }, 100);
    };

    DiffProcessor.prototype.highlightDiffData = function(diffData) {
      var e, file, fileList, filePath, line, mergeLine, mergeLineText, _, _results;

      _results = [];
      for (filePath in diffData) {
        fileList = diffData[filePath];
        _results.push((function() {
          var _i, _len, _results1;

          _results1 = [];
          for (_i = 0, _len = fileList.length; _i < _len; _i++) {
            file = fileList[_i];
            _results1.push((function() {
              var _ref, _results2;

              _ref = file.lines;
              _results2 = [];
              for (_ in _ref) {
                line = _ref[_];
                if (line.lineElement.getAttribute('github-diff-highlighter-highlighted') != null) {
                  continue;
                }
                _results2.push((function() {
                  var _j, _len1, _ref1, _results3;

                  _ref1 = this.getLinesToMerge(filePath, line);
                  _results3 = [];
                  for (_j = 0, _len1 = _ref1.length; _j < _len1; _j++) {
                    mergeLine = _ref1[_j];
                    try {
                      mergeLineText = mergeLine.line.replace(/&nbsp;/g, ' ');
                      line.lineElement.innerHTML = line.diffMarker + new LineMerger(line.line, mergeLineText).combineIntoHtml();
                      line.lineElement.setAttribute('github-diff-highlighter-highlighted', true);
                      break;
                    } catch (_error) {
                      e = _error;
                    }
                  }
                  return _results3;
                }).call(this));
              }
              return _results2;
            }).call(this));
          }
          return _results1;
        }).call(this));
      }
      return _results;
    };

    DiffProcessor.prototype.fetchPageHtml = function(url, callback) {
      var xhr,
        _this = this;

      xhr = new XMLHttpRequest();
      xhr.onerror = function() {
        logMessages(xhr.status, xhr);
        return _this.numPagesToFetchBeforeProcessing--;
      };
      xhr.onload = function() {
        if (xhr.status === 200) {
          callback(null, xhr.responseText);
          _this.numPagesToFetchBeforeProcessing--;
          return _this.highlightWhenDataReady();
        } else {
          return xhr.onerror(xhr);
        }
      };
      xhr.open("GET", url);
      return xhr.send();
    };

    DiffProcessor.prototype.buildBlobPrefixFromCommitIdentifier = function(sha) {
      return "https://github.com" + currentRepoPath + "tree/" + sha + "/";
    };

    DiffProcessor.prototype.buildBlobPrefixFromCommitUrl = function(commitUrl) {
      return this.buildCommitPathFromSha(this.endsInShaRegex.exec(commitUrl)[0]);
    };

    DiffProcessor.prototype.fetchCurrentHtml = function() {
      var blobPrefix, file, filePath, _i, _len, _ref, _results;

      blobPrefix = this.buildBlobPrefixFromCommitIdentifier(this.currentCommitIdentifier);
      _ref = this.changedFilePaths;
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        filePath = _ref[_i];
        this.currentData[filePath] = file = new File(filePath);
        _results.push(this.fetchPageHtml(blobPrefix + filePath, this.getStoreHtml(file)));
      }
      return _results;
    };

    DiffProcessor.prototype.getStoreHtml = function(htmlFile) {
      var _this = this;

      return function(error, html) {
        var file, files, line, lineContents, lineNumber, _i, _len, _results;

        files = _this.getFilesFromHtmlText(html);
        _results = [];
        for (_i = 0, _len = files.length; _i < _len; _i++) {
          file = files[_i];
          _results.push((function() {
            var _j, _len1, _ref, _results1;

            _ref = file.querySelectorAll('.line');
            _results1 = [];
            for (_j = 0, _len1 = _ref.length; _j < _len1; _j++) {
              line = _ref[_j];
              lineNumber = parseInt(line.id.substr(2));
              lineContents = line.innerHTML;
              _results1.push(htmlFile.storeLine(line, lineContents, lineNumber));
            }
            return _results1;
          })());
        }
        return _results;
      };
    };

    DiffProcessor.prototype.fetchParentHtml = function() {
      var blobPrefix, file, filePath, parent, _base, _i, _len, _ref, _results;

      _ref = this.parentCommitIdentifiers;
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        parent = _ref[_i];
        blobPrefix = this.buildBlobPrefixFromCommitIdentifier(parent);
        (_base = this.parentData)[parent] || (_base[parent] = {});
        _results.push((function() {
          var _j, _len1, _ref1, _results1;

          _ref1 = this.changedFilePaths;
          _results1 = [];
          for (_j = 0, _len1 = _ref1.length; _j < _len1; _j++) {
            filePath = _ref1[_j];
            this.parentData[parent][filePath] = file = new File(filePath);
            _results1.push(this.fetchPageHtml(blobPrefix + filePath, this.getStoreHtml(file)));
          }
          return _results1;
        }).call(this));
      }
      return _results;
    };

    DiffProcessor.prototype.getFilesFromHtmlText = function(htmlText) {
      var asHtml;

      asHtml = document.createElement('html');
      asHtml.innerHTML = htmlText;
      return asHtml.querySelectorAll('.file');
    };

    DiffProcessor.prototype.getRegularDiffData = function() {
      return this.getDiffData(document.querySelectorAll('.file'), this.changedFilePaths);
    };

    DiffProcessor.prototype.getInlineDiffData = function() {
      return this.getDiffData(document.querySelectorAll('.inline-review-comment .file-diff'), this.inlineChangedFilePaths);
    };

    DiffProcessor.prototype.getDiffData = function(changedFileElements, changedFilePaths) {
      var diffData, e, file, i, line, lineContainer, lineContents, lineNumberCurrent, lineNumberElements, lineNumberPrevious, lines, path, _i, _j, _len, _len1, _ref, _ref1;

      diffData = {};
      for (i = _i = 0, _len = changedFilePaths.length; _i < _len; i = ++_i) {
        path = changedFilePaths[i];
        diffData[path] || (diffData[path] = []);
        file = new File(path);
        diffData[path].push(file);
        lines = (_ref = changedFileElements[i]) != null ? _ref.querySelectorAll('.file-diff-line') : void 0;
        if (lines != null) {
          for (_j = 0, _len1 = lines.length; _j < _len1; _j++) {
            line = lines[_j];
            lineNumberElements = line.querySelectorAll('.diff-line-num');
            _ref1 = (function() {
              var _k, _len2, _results;

              _results = [];
              for (_k = 0, _len2 = lineNumberElements.length; _k < _len2; _k++) {
                e = lineNumberElements[_k];
                _results.push(parseInt(e.getAttribute('data-line-number')));
              }
              return _results;
            })(), lineNumberPrevious = _ref1[0], lineNumberCurrent = _ref1[1];
            lineNumberCurrent || (lineNumberCurrent = parseInt(line.getAttribute('data-line')));
            lineContainer = line.querySelector('.diff-line-pre');
            if (lineContainer) {
              lineContents = lineContainer.innerHTML;
              file.storeDiffLine(lineContainer, lineContents, lineNumberPrevious, lineNumberCurrent);
            }
          }
        }
      }
      return diffData;
    };

    DiffProcessor.prototype.fetchAndHighlight = function() {
      this.fetchCurrentHtml();
      return this.fetchParentHtml();
    };

    return DiffProcessor;

  })();

  style = document.createElement('style');

  style.type = 'text/css';

  style.innerHTML = '.highlight span.x {\n    color: inherit !important;\n}';

  document.getElementsByTagName('head')[0].appendChild(style);

  diffProcessor = new DiffProcessor();

  diffProcessor.fetchAndHighlight();

}).call(this);
