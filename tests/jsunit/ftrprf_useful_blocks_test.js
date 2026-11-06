/**
 * FTRPRF hidden-blocks / useful-blocks data contract (TR-4805).
 *
 * Saved FTRPRF exercises carry two things scratch-blocks has to understand:
 *   - hidden script groups: a root (hat) block whose comment starts with
 *     "%hidden%" (Block#setHiddenComment); loading it calls setInvisible(true);
 *   - the useful-blocks list: a procedures_definition for the
 *     "Exercise blocks" prototype whose stacked blocks name the blocks the
 *     toolbox should offer (Workspace#getUsefulBlocks and friends).
 * See ftrprf_fixtures.js for the historical XML shapes.
 */
'use strict';

goog.require('goog.testing');

var ftrprfTest_workspaces = [];
var ftrprfTest_divs = [];

/**
 * Create a workspace that is disposed in tearDown. The toolbox hook is
 * replaced by a recorder so tests can assert on it.
 * @param {boolean=} opt_developerMode Put the workspace in developer mode.
 * @param {boolean=} opt_rendered Inject a rendered WorkspaceSvg instead of a
 *     headless workspace. Needed for procedures with arguments: upstream
 *     creates their argument reporters with initSvg() unconditionally.
 * @return {!Blockly.Workspace} The workspace.
 */
function ftrprfTest_newWorkspace(opt_developerMode, opt_rendered) {
  var ws;
  if (opt_rendered) {
    var div = document.createElement('div');
    div.style.width = '600px';
    div.style.height = '480px';
    document.body.appendChild(div);
    ftrprfTest_divs.push(div);
    ws = Blockly.inject(div, {
      toolbox: document.getElementById('toolbox'),
      media: '../../media/'
    });
  } else {
    ws = new Blockly.Workspace();
  }
  ws.filterCalls = [];
  ws.externalFilterToolboxCallback = function(usefulBlocks) {
    ws.filterCalls.push(usefulBlocks.slice());
  };
  if (opt_developerMode) {
    ws.setDeveloperMode(true);
  }
  ftrprfTest_workspaces.push(ws);
  return ws;
}

function setUp() {
  // Hat blocks read the media path off the main workspace while initialising
  // (e.g. the green flag image); a headless test has none.
  Blockly.mainWorkspace = {options: {pathToMedia: '../../media/'}};
}

function tearDown() {
  for (var i = 0; i < ftrprfTest_workspaces.length; i++) {
    ftrprfTest_workspaces[i].dispose();
  }
  ftrprfTest_workspaces = [];
  for (var i = 0; i < ftrprfTest_divs.length; i++) {
    document.body.removeChild(ftrprfTest_divs[i]);
  }
  ftrprfTest_divs = [];
  Blockly.mainWorkspace = null;
}

/**
 * Load XML text into a workspace the way scratch-gui does.
 * @param {string} xmlText Workspace XML.
 * @param {!Blockly.Workspace} ws Destination workspace.
 */
function ftrprfTest_load(xmlText, ws) {
  Blockly.Xml.domToWorkspace(Blockly.Xml.textToDom(xmlText), ws);
}

/**
 * Build one block (and its children) from XML text.
 * @param {string} blockXml A single `<block>` element.
 * @param {!Blockly.Workspace} ws Destination workspace.
 * @return {!Blockly.Block} The new root block.
 */
function ftrprfTest_block(blockXml, ws) {
  var dom = Blockly.Xml.textToDom(
      '<xml xmlns="http://www.w3.org/1999/xhtml">' + blockXml + '</xml>');
  return Blockly.Xml.domToBlock(dom.firstChild, ws);
}

/**
 * @param {!Blockly.Workspace} ws Workspace.
 * @return {!Array.<!Blockly.Block>} Top-level definitions of 'Exercise blocks'.
 */
function ftrprfTest_exerciseDefinitions(ws) {
  return ws.getTopBlocks(false).filter(function(block) {
    return block.isDefineExerciseBlocksBlock();
  });
}

// ---------------------------------------------------------------------------
// XML normalization for the round-trip comparisons.
//
// The VM and Blockly write the same data with different cosmetics, so both
// sides are reduced to a canonical string. Each rule names why it is safe:
//   - attribute order and child order are not significant (children are
//     sorted by a fixed tag rank, then by name/id; same-key siblings keep
//     their order);
//   - `<statement>` == `<value>`: the VM writes every input as `<value>` and
//     Blockly reads both through the same branch;
//   - block `deletable`: runtime state set by setInvisible for
//     non-developers; the VM never persists it;
//   - block-comment id/x/y/w/h/pinned/minimized: bubble geometry lives in the
//     rendered ScratchBlockComment (untouched by this fork); a headless block
//     keeps only the comment text, which is the part that carries %hidden%;
//   - block-comment text loses trailing whitespace ("%hidden%\n" ->
//     "%hidden%"): upstream BlockSvg.getCommentText trims it on every save,
//     so a rendered workspace never writes it back; the marker is unaffected;
//   - workspace-comment `minimized`: written by WorkspaceComment on save only;
//   - attribute names are lower-cased (HTML DOM vs XML DOM).
// ---------------------------------------------------------------------------

var FTRPRF_TAG_RANK = {
  'variables': 0, 'variable': 0, 'mutation': 1, 'field': 2, 'comment': 3,
  'data': 4, 'value': 5, 'shadow': 6, 'block': 7, 'next': 8
};

var FTRPRF_IGNORED_ATTRIBUTES = {
  'xml': ['xmlns'],
  'block': ['deletable'],
  'shadow': ['deletable'],
  'blockComment': ['id', 'x', 'y', 'w', 'h', 'pinned', 'minimized'],
  'workspaceComment': ['minimized']
};

/**
 * @param {!Element} element An XML element.
 * @param {boolean} isTopLevel Whether the element is a child of `<xml>`.
 * @return {string} Canonical form.
 */
function ftrprfTest_canonical(element, isTopLevel) {
  var tag = element.nodeName.toLowerCase();
  if (tag == 'statement') {
    tag = 'value';
  }
  var ignoreKey = tag;
  if (tag == 'comment') {
    ignoreKey = isTopLevel ? 'workspaceComment' : 'blockComment';
  }
  var ignored = FTRPRF_IGNORED_ATTRIBUTES[ignoreKey] || [];
  var attributes = [];
  for (var i = 0; i < element.attributes.length; i++) {
    var name = element.attributes[i].name.toLowerCase();
    if (ignored.indexOf(name) == -1) {
      attributes.push(name + '=' + JSON.stringify(element.attributes[i].value));
    }
  }
  attributes.sort();

  var children = [];
  var text = '';
  for (var i = 0, child; child = element.childNodes[i]; i++) {
    if (child.nodeType == 1) {
      children.push(child);
    } else if (child.nodeType == 3 || child.nodeType == 4) {
      text += child.nodeValue;
    }
  }
  var keyed = children.map(function(child, index) {
    var childTag = child.nodeName.toLowerCase();
    if (childTag == 'statement') {
      childTag = 'value';
    }
    var rank = FTRPRF_TAG_RANK.hasOwnProperty(childTag) ?
        FTRPRF_TAG_RANK[childTag] : 9;
    var key = child.getAttribute('name') ||
        (tag == 'xml' ? child.getAttribute('id') : '') || '';
    return {rank: rank, key: key, index: index,
      text: ftrprfTest_canonical(child, tag == 'xml')};
  });
  keyed.sort(function(a, b) {
    return (a.rank - b.rank) || (a.key < b.key ? -1 : a.key > b.key ? 1 : 0) ||
        (a.index - b.index);
  });
  var out = '<' + tag + (attributes.length ? ' ' + attributes.join(' ') : '') + '>';
  if (children.length) {
    out += keyed.map(function(k) { return k.text; }).join('');
  } else if (ignoreKey == 'blockComment') {
    out += JSON.stringify(text.replace(/\s+$/, '').replace(/ +\n/g, '\n'));
  } else {
    out += JSON.stringify(text);
  }
  return out + '</' + tag + '>';
}

/**
 * Canonical form of a workspace XML DOM, optionally without the
 * auto-created 'Exercise blocks' definition.
 * @param {!Element} xml `<xml>` element.
 * @param {boolean} dropExerciseDefinition Drop top-level definitions of
 *     'Exercise blocks'.
 * @return {string} Canonical form.
 */
function ftrprfTest_canonicalWorkspace(xml, dropExerciseDefinition) {
  var copy = xml.cloneNode(true);
  if (dropExerciseDefinition) {
    var tops = Array.prototype.slice.call(copy.childNodes);
    for (var i = 0; i < tops.length; i++) {
      var top = tops[i];
      if (top.nodeType == 1 &&
          top.getAttribute('type') == 'procedures_definition' &&
          Blockly.Xml.domToText(top).indexOf('proccode="Exercise blocks"') != -1) {
        copy.removeChild(top);
      }
    }
  }
  return ftrprfTest_canonical(copy, false);
}

// ---------------------------------------------------------------------------
// Block API
// ---------------------------------------------------------------------------

var FTRPRF_FLAG_SCRIPT = '<block id="flag" type="event_whenflagclicked" x="0" y="0">' +
    '<next><block id="rep" type="control_repeat">' +
    '<value name="TIMES"><shadow id="times" type="math_whole_number">' +
    '<field name="NUM">10</field></shadow></value>' +
    '<statement name="SUBSTACK">' + ftrprfFixture_moveSteps('inner') +
    '</statement>' +
    '<next>' + ftrprfFixture_moveSteps('after') + '</next>' +
    '</block></next></block>';

function test_setInvisible_hidesBlockAndChildren() {
  var ws = ftrprfTest_newWorkspace();
  var flag = ftrprfTest_block(FTRPRF_FLAG_SCRIPT, ws);
  var ids = ['flag', 'rep', 'times', 'inner', 'after'];

  assertTrue('flag is the root', flag.isRootBlock());
  assertFalse('rep is not a root', ws.getBlockById('rep').isRootBlock());
  assertTrue('a hat block is a hat', flag.isHatBlock());
  assertFalse('a stack block is not a hat', ws.getBlockById('rep').isHatBlock());
  ids.forEach(function(id) {
    assertFalse(id + ' starts visible', ws.getBlockById(id).isInvisible());
  });

  // Hiding from a child hides the whole group, which lives on the root.
  flag.setInvisible(true);
  ids.forEach(function(id) {
    assertTrue(id + ' is hidden', ws.getBlockById(id).isInvisible());
  });
  ['flag', 'rep', 'inner', 'after'].forEach(function(id) {
    assertFalse(id + ' is not deletable for non-developers',
        ws.getBlockById(id).isDeletable());
  });

  // Dragged out of the group, a block is no longer hidden: the flag is the
  // root's, not the child's.
  var after = ws.getBlockById('after');
  after.unplug();
  assertTrue('after is now a root', after.isRootBlock());
  assertFalse('a non-hat root is never hidden', after.isInvisible());

  flag.setInvisible(false);
  ['flag', 'rep', 'inner'].forEach(function(id) {
    assertFalse(id + ' is visible again', ws.getBlockById(id).isInvisible());
    assertTrue(id + ' is deletable again', ws.getBlockById(id).isDeletable());
  });
}

function test_setInvisible_developerMode_keepsBlocksDeletable() {
  var ws = ftrprfTest_newWorkspace(true);
  var flag = ftrprfTest_block(FTRPRF_FLAG_SCRIPT, ws);
  flag.setInvisible(true);
  assertTrue('the flag is still recorded', flag.isInvisible());
  assertTrue('rep reads the root', ws.getBlockById('rep').isInvisible());
  assertTrue('developers can still delete', ws.getBlockById('rep').isDeletable());
}

function test_invisible_roundTripsThroughXml() {
  var fixture = ftrprfFixture_xml('',
      ftrprfFixture_hiddenFlagScript('%hidden%', false));
  var ws = ftrprfTest_newWorkspace();
  ftrprfTest_load(fixture, ws);
  assertTrue('flag hidden after load', ws.getBlockById('flag').isInvisible());
  assertTrue('move hidden after load', ws.getBlockById('move').isInvisible());
  assertFalse('move not deletable', ws.getBlockById('move').isDeletable());

  var flagDom = Blockly.Xml.blockToDom(ws.getBlockById('flag'));
  var comment = flagDom.getElementsByTagName('comment')[0];
  assertEquals('the marker is the serialized form', '%hidden%',
      comment.textContent);

  var ws2 = ftrprfTest_newWorkspace();
  Blockly.Xml.domToWorkspace(Blockly.Xml.workspaceToDom(ws), ws2);
  assertTrue('still hidden after a second trip',
      ws2.getBlockById('flag').isInvisible());
  assertTrue('child still hidden after a second trip',
      ws2.getBlockById('move').isInvisible());
}

function test_hiddenComment_roundTripsThroughXml() {
  var ws = ftrprfTest_newWorkspace();
  var flag = ftrprfTest_block(FTRPRF_FLAG_SCRIPT, ws);
  flag.setCommentText('Zet de sprite klaar');

  // Called on a child, the marker still lands on the root.
  ws.getBlockById('inner').setHiddenComment(true);
  assertEquals('%hidden%\nZet de sprite klaar', flag.getCommentText());
  assertEquals('no marker on the child', '',
      ws.getBlockById('inner').getCommentText());
  // Idempotent.
  flag.setHiddenComment(true);
  assertEquals('%hidden%\nZet de sprite klaar', flag.getCommentText());

  var ws2 = ftrprfTest_newWorkspace();
  var copy = Blockly.Xml.domToBlock(Blockly.Xml.blockToDom(flag), ws2);
  assertEquals('%hidden%\nZet de sprite klaar', copy.getCommentText());
  assertTrue('the copy is hidden', copy.isInvisible());
  assertTrue('its children are hidden', ws2.getBlockById('after').isInvisible());

  flag.setHiddenComment(false);
  assertEquals('unhiding restores the comment', 'Zet de sprite klaar',
      flag.getCommentText());

  // Without a prior comment, hiding writes "%hidden%\n" and unhiding removes
  // the comment entirely.
  var ws3 = ftrprfTest_newWorkspace();
  var bare = ftrprfTest_block(FTRPRF_FLAG_SCRIPT, ws3);
  bare.setHiddenComment(true);
  assertEquals('%hidden%\n', bare.getCommentText());
  bare.setHiddenComment(false);
  assertEquals('', bare.getCommentText());
  assertNull('comment removed', bare.comment);
  // Unhiding a block without any comment is a no-op, not a crash.
  bare.setHiddenComment(false);
  assertEquals('', bare.getCommentText());
}

// ---------------------------------------------------------------------------
// Workspace API
// ---------------------------------------------------------------------------

function test_usefulBlocks_roundTripThroughDefineExerciseBlocksMutation() {
  var fixture = ftrprfFixture_xml('', ftrprfFixture_defineExerciseBlocks('def',
      ftrprfFixture_comment('hc', '%hidden%\n' + FTRPRF_EXPLANATION, false),
      ftrprfFixture_call('c1', 'Drop Brandstof', 'false',
          ftrprfFixture_moveSteps('move'))));
  var ws = ftrprfTest_newWorkspace();
  ftrprfTest_load(fixture, ws);

  var def = ws.getBlockById('def');
  assertTrue('the definition is recognised', def.isDefineExerciseBlocksBlock());
  assertEquals(def, ws.getDefineExerciseBlocksBlock());
  assertFalse('other blocks are not',
      ws.getBlockById('c1').isDefineExerciseBlocksBlock());
  assertEquals('no second definition is created', 1,
      ftrprfTest_exerciseDefinitions(ws).length);
  assertArrayEquals(['Drop Brandstof', 'motion_movesteps', 'math_number'],
      ws.getUsefulBlocks());
  assertTrue('the definition is hidden for non-developers', def.isInvisible());

  var xml = Blockly.Xml.workspaceToDom(ws);
  var mutation = xml.getElementsByTagName('mutation')[0];
  assertEquals('Exercise blocks', mutation.getAttribute('proccode'));
  assertEquals('[]', mutation.getAttribute('argumentids'));
  assertEquals('[]', mutation.getAttribute('argumentnames'));
  assertEquals('[]', mutation.getAttribute('argumentdefaults'));
  assertEquals('false', mutation.getAttribute('warp'));

  var ws2 = ftrprfTest_newWorkspace();
  Blockly.Xml.domToWorkspace(xml, ws2);
  assertArrayEquals(['Drop Brandstof', 'motion_movesteps', 'math_number'],
      ws2.getUsefulBlocks());
  assertEquals(1, ftrprfTest_exerciseDefinitions(ws2).length);
}

function test_defineExerciseBlocks_autoCreatedWhenMissing() {
  var ws = ftrprfTest_newWorkspace();
  ftrprfTest_load(ftrprfFixture_xml('',
      '<block id="flag" type="event_whenflagclicked" x="0" y="0"></block>'), ws);
  var definitions = ftrprfTest_exerciseDefinitions(ws);
  assertEquals('one definition is created', 1, definitions.length);
  assertTrue('hidden for non-developers', definitions[0].isInvisible());
  assertEquals('no explanation for non-developers', '',
      definitions[0].getCommentText());
  assertArrayEquals('an empty list does not filter', [], ws.getUsefulBlocks());

  var devWs = ftrprfTest_newWorkspace(true);
  ftrprfTest_load(ftrprfFixture_xml('',
      '<block id="flag" type="event_whenflagclicked" x="0" y="0"></block>'),
      devWs);
  var devDefinitions = ftrprfTest_exerciseDefinitions(devWs);
  assertEquals(1, devDefinitions.length);
  assertFalse('visible for developers', devDefinitions[0].isInvisible());
  assertEquals('developers get the explanation', FTRPRF_EXPLANATION,
      devDefinitions[0].getCommentText());
}

function test_mapBlocksToType() {
  var ws = ftrprfTest_newWorkspace();
  var call = ftrprfTest_block(ftrprfFixture_call('c1', 'Drop Energie', 'false'), ws);
  var move = ftrprfTest_block(ftrprfFixture_moveSteps('move'), ws);
  var stop = ftrprfTest_block('<block id="stop" type="control_stop">' +
      '<field name="STOP_OPTION">all</field></block>', ws);
  assertArrayEquals(['Drop Energie', 'motion_movesteps', 'control_stop'],
      ws.mapBlocksToType([call, move, stop]));
  assertArrayEquals([], ws.mapBlocksToType([]));
}

var FTRPRF_NEW_MUTATION =
    '<mutation proccode="Mijn blok" argumentids="[]" warp="false"></mutation>';

function test_addNewMutationToUsefulBlocks_withAndWithoutExerciseBlocks() {
  var mutation = Blockly.Xml.textToDom(
      '<xml>' + FTRPRF_NEW_MUTATION + '</xml>').firstChild;

  // No useful blocks defined: the toolbox is not filtered, nothing changes.
  var ws = ftrprfTest_newWorkspace();
  ftrprfTest_load(ftrprfFixture_xml('',
      ftrprfFixture_defineExerciseBlocks('def', '', '')), ws);
  ws.addNewMutationToUsefulBlocks(mutation, true);
  assertArrayEquals([], ws.getUsefulBlocks());
  assertNull('nothing appended', ws.getBlockById('def').getNextBlock());

  // With useful blocks, the proccode is added once.
  var ws2 = ftrprfTest_newWorkspace();
  ftrprfTest_load(ftrprfFixture_xml('', ftrprfFixture_defineExerciseBlocks('def',
      '', ftrprfFixture_call('c1', 'Drop Brandstof', 'false'))), ws2);
  ws2.addNewMutationToUsefulBlocks(mutation, false);
  assertArrayEquals(['Drop Brandstof', 'Mijn blok'], ws2.getUsefulBlocks());
  assertNull('not appended without addToExerciseBlocks',
      ws2.getBlockById('c1').getNextBlock());
  ws2.addNewMutationToUsefulBlocks(mutation, false);
  assertArrayEquals('deduplicated', ['Drop Brandstof', 'Mijn blok'],
      ws2.getUsefulBlocks());

  // With addToExerciseBlocks, a call is stacked under the definition.
  ws2.addNewMutationToUsefulBlocks(mutation, true);
  var appended = ws2.getBlockById('c1').getNextBlock();
  assertNotNull('a call is appended', appended);
  assertEquals('procedures_call', appended.type);
  assertEquals('Mijn blok', appended.getProcCode());
  var reloaded = ftrprfTest_newWorkspace();
  Blockly.Xml.domToWorkspace(Blockly.Xml.workspaceToDom(ws2), reloaded);
  assertArrayEquals(['Drop Brandstof', 'Mijn blok'], reloaded.getUsefulBlocks());
}

function test_externalFilterToolboxCallback_calledWithUsefulBlocks_onMutationChange() {
  var ws = ftrprfTest_newWorkspace();
  ftrprfTest_load(ftrprfFixture_xml('', ftrprfFixture_defineExerciseBlocks('def',
      '', ftrprfFixture_call('c1', 'Drop Brandstof', 'false'))), ws);
  assertEquals('called once on load', 1, ws.filterCalls.length);
  assertArrayEquals(['Drop Brandstof'], ws.filterCalls[0]);

  var mutation = Blockly.Xml.textToDom(
      '<xml>' + FTRPRF_NEW_MUTATION + '</xml>').firstChild;
  ws.addNewMutationToUsefulBlocks(mutation, false);
  assertEquals(2, ws.filterCalls.length);
  assertArrayEquals(['Drop Brandstof', 'Mijn blok'], ws.filterCalls[1]);

  ws.setUsefulBlocks(['motion_movesteps']);
  assertArrayEquals(['motion_movesteps'], ws.filterCalls[2]);

  // The prototype default does not throw when a host never overrides it.
  var plain = new Blockly.Workspace();
  ftrprfTest_workspaces.push(plain);
  plain.setUsefulBlocks(['motion_movesteps']);
  assertArrayEquals(['motion_movesteps'], plain.getUsefulBlocks());
}

function test_addNewMutationToExerciseBlocks_withoutDefineBlock_doesNotThrow() {
  // FTRPRF20-5XN: a workspace without the definition used to throw on
  // exerciseBlock.getChildren().
  var mutation = Blockly.Xml.textToDom(
      '<xml>' + FTRPRF_NEW_MUTATION + '</xml>').firstChild;
  var ws = ftrprfTest_newWorkspace();
  ftrprfTest_block(FTRPRF_FLAG_SCRIPT, ws);
  assertUndefined(ws.getDefineExerciseBlocksBlock());
  var before = ws.getAllBlocks().length;
  ws.addNewMutationToExerciseBlocks(mutation);
  ws.setUsefulBlocks(['motion_movesteps']);
  ws.addNewMutationToUsefulBlocks(mutation, true);
  assertEquals('no stray block created', before, ws.getAllBlocks().length);
  assertArrayEquals(['motion_movesteps', 'Mijn blok'], ws.getUsefulBlocks());

  // A chain ending in a cap block has no connection to stack onto.
  var ws2 = ftrprfTest_newWorkspace();
  ftrprfTest_load(ftrprfFixture_xml('', ftrprfFixture_defineExerciseBlocks('def',
      '', ftrprfFixture_call('c1', 'Drop Brandstof', 'false',
          '<block id="cap" type="control_delete_this_clone"></block>'))), ws2);
  var before2 = ws2.getAllBlocks().length;
  ws2.addNewMutationToExerciseBlocks(mutation);
  assertEquals('no stray block created', before2, ws2.getAllBlocks().length);
}

function test_isProcCodeUseful() {
  var ws = ftrprfTest_newWorkspace();
  assertFalse('the definition itself is never offered',
      ws.isProcCodeUseful('Exercise blocks'));
  assertTrue('no list means everything is useful', ws.isProcCodeUseful('Spring'));

  ws.setUsefulBlocks(['Spring', 'motion_movesteps']);
  assertTrue(ws.isProcCodeUseful('Spring'));
  assertFalse(ws.isProcCodeUseful('Drop Energie'));

  ws.setDeveloperMode(true);
  assertTrue('developers see every custom block', ws.isProcCodeUseful('Drop Energie'));
  assertFalse(ws.isProcCodeUseful('Exercise blocks'));
}

function test_procedureDefinitionAndCall_mutationsRoundTrip() {
  var definition = '<block id="def" type="procedures_definition" x="10" y="10">' +
      '<statement name="custom_block"><shadow id="proto" type="procedures_prototype">' +
      '<mutation proccode="Draai %s graden" argumentids="[&quot;a1&quot;]" ' +
      'argumentnames="[&quot;aantal&quot;]" argumentdefaults="[&quot;&quot;]" ' +
      'warp="true"></mutation>' +
      '<value name="a1"><shadow id="pa1" type="argument_reporter_string_number">' +
      '<field name="VALUE">aantal</field></shadow></value>' +
      '</shadow></statement></block>';
  var call = '<block id="call" type="procedures_call" x="10" y="200">' +
      '<mutation proccode="Draai %s graden" argumentids="[&quot;a1&quot;]" ' +
      'warp="true"></mutation>' +
      '<value name="a1"><shadow id="n1" type="text">' +
      '<field name="TEXT">90</field></shadow></value></block>';
  var ws = ftrprfTest_newWorkspace(false, true);
  ftrprfTest_load(ftrprfFixture_xml('',
      ftrprfFixture_defineExerciseBlocks('dex', '', '') + definition + call), ws);

  var protoMutation = Blockly.Xml.blockToDom(ws.getBlockById('proto'))
      .getElementsByTagName('mutation')[0];
  assertEquals('Draai %s graden', protoMutation.getAttribute('proccode'));
  assertEquals('["a1"]', protoMutation.getAttribute('argumentids'));
  assertEquals('["aantal"]', protoMutation.getAttribute('argumentnames'));
  assertEquals('[""]', protoMutation.getAttribute('argumentdefaults'));
  assertEquals('true', protoMutation.getAttribute('warp'));
  var callMutation = Blockly.Xml.blockToDom(ws.getBlockById('call'))
      .getElementsByTagName('mutation')[0];
  assertEquals('Draai %s graden', callMutation.getAttribute('proccode'));
  assertEquals('["a1"]', callMutation.getAttribute('argumentids'));
  assertEquals('true', callMutation.getAttribute('warp'));

  // The procedures flyout never offers 'Exercise blocks', and offers only the
  // useful custom blocks once a list exists.
  var procCodes = function() {
    return Blockly.Procedures.flyoutCategory(ws).filter(function(el) {
      return el.nodeName.toLowerCase() == 'block';
    }).map(function(el) {
      return el.getElementsByTagName('mutation')[0].getAttribute('proccode');
    });
  };
  assertArrayEquals(['Draai %s graden'], procCodes());
  ws.setUsefulBlocks(['motion_movesteps']);
  assertArrayEquals([], procCodes());
  ws.setUsefulBlocks(['Draai %s graden']);
  assertArrayEquals(['Draai %s graden'], procCodes());
}

function test_newProcedure_byNonDeveloper_isAddedToUsefulBlocks() {
  var ws = ftrprfTest_newWorkspace();
  ftrprfTest_load(ftrprfFixture_xml('', ftrprfFixture_defineExerciseBlocks('def',
      '', ftrprfFixture_call('c1', 'Drop Brandstof', 'false'))), ws);
  var mutation = Blockly.Xml.textToDom('<xml><mutation proccode="Mijn blok" ' +
      'argumentids="[]" argumentnames="[]" argumentdefaults="[]" warp="false">' +
      '</mutation></xml>').firstChild;
  Blockly.Procedures.createProcedureCallbackFactory_(ws)(mutation);
  assertArrayEquals(['Drop Brandstof', 'Mijn blok'], ws.getUsefulBlocks());
  assertEquals('Mijn blok', ws.getBlockById('c1').getNextBlock().getProcCode());

  var devWs = ftrprfTest_newWorkspace(true);
  ftrprfTest_load(ftrprfFixture_xml('', ftrprfFixture_defineExerciseBlocks('def',
      '', ftrprfFixture_call('c1', 'Drop Brandstof', 'false'))), devWs);
  Blockly.Procedures.createProcedureCallbackFactory_(devWs)(mutation);
  assertArrayEquals('developers decide the list themselves',
      ['Drop Brandstof'], devWs.getUsefulBlocks());
}

// ---------------------------------------------------------------------------
// Historical shapes: test_historicalShape_<name>_roundTrips, one per SHAPES.md
// entry (see ftrprf_fixtures.js).
// ---------------------------------------------------------------------------

/**
 * @param {!Object} fixture An FTRPRF_FIXTURES entry.
 * @param {boolean} rendered Use rendered workspaces (what scratch-gui does).
 */
function ftrprfTest_assertHistoricalShape(fixture, rendered) {
  var label = fixture.shape + ' (' + fixture.era + ', ' + fixture.source +
      (rendered ? ', rendered' : ', headless') + '): ';
  var input = Blockly.Xml.textToDom(fixture.xml);
  var hadDefinition = fixture.xml.indexOf('proccode="Exercise blocks"') != -1;

  var ws = ftrprfTest_newWorkspace(false, rendered);
  Blockly.Xml.domToWorkspace(input, ws);

  var assertFlags = function(workspace, when) {
    fixture.expect.invisible.forEach(function(id) {
      var block = workspace.getBlockById(id);
      assertNotNull(label + id + ' exists ' + when, block);
      assertTrue(label + id + ' hidden ' + when, block.isInvisible());
    });
    fixture.expect.visible.forEach(function(id) {
      var block = workspace.getBlockById(id);
      assertNotNull(label + id + ' exists ' + when, block);
      assertFalse(label + id + ' visible ' + when, block.isInvisible());
    });
    assertEquals(label + 'exactly one Exercise blocks definition ' + when, 1,
        ftrprfTest_exerciseDefinitions(workspace).length);
    assertArrayEquals(label + 'useful blocks ' + when,
        fixture.expect.useful || [], workspace.getUsefulBlocks());
  };
  assertFlags(ws, 'after load');
  if (rendered) {
    // Non-developers do not see hidden groups: the root's SVG group (which
    // holds the whole stack) is hidden; other scripts are not.
    ws.getTopBlocks(false).forEach(function(top) {
      var style = top.getSvgRoot().getAttribute('style') || '';
      assertEquals(label + top.id + ' drawn hidden iff invisible',
          top.isInvisible(), style.indexOf('visibility:hidden') != -1);
    });
  }

  var output = Blockly.Xml.workspaceToDom(ws);
  var expected = ftrprfTest_canonicalWorkspace(input, false);
  var actualText = Blockly.Xml.domToText(output);
  if (fixture.expect.callWarp) {
    // Upstream canonicalization, see the fixture.
    expected = ftrprfTest_canonicalWorkspace(Blockly.Xml.textToDom(
        fixture.xml.replace(/argumentids="\[\]">/g,
            'argumentids="[]" warp="' + fixture.expect.callWarp + '">')), false);
  }
  assertEquals(label + 'workspaceToDom equals the input', expected,
      ftrprfTest_canonicalWorkspace(output, !hadDefinition));

  var ws2 = ftrprfTest_newWorkspace(false, rendered);
  Blockly.Xml.domToWorkspace(Blockly.Xml.textToDom(actualText), ws2);
  assertFlags(ws2, 'after a second trip');
  assertEquals(label + 'stable on a second trip',
      ftrprfTest_canonicalWorkspace(output, false),
      ftrprfTest_canonicalWorkspace(Blockly.Xml.workspaceToDom(ws2), false));
}

FTRPRF_FIXTURES.forEach(function(fixture) {
  window['test_historicalShape_' + fixture.name + '_roundTrips'] = function() {
    // Procedures with arguments cannot load headless (upstream initSvg()).
    if (!/argumentnames="\[&quot;/.test(fixture.xml)) {
      ftrprfTest_assertHistoricalShape(fixture, false);
    }
    ftrprfTest_assertHistoricalShape(fixture, true);
  };
});

function test_historicalShapes_coverEverySHAPESEntry() {
  // 15 H.* + 9 D.* + 12 P.* entries in SHAPES.md.
  assertEquals(36, FTRPRF_FIXTURES.length);
  var shapes = FTRPRF_FIXTURES.map(function(f) { return f.shape; });
  shapes.forEach(function(shape, i) {
    assertEquals('duplicate shape ' + shape, i, shapes.indexOf(shape));
  });
}
