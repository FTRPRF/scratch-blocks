/**
 * FTRPRF historical project-data shapes, as Blockly XML.
 *
 * One entry per shape in the monorepo's
 * tools/scratch-compat/fixtures/SHAPES.md (TR-4805 Task 0). Saved projects are
 * sb3 JSON; what scratch-blocks actually receives is the XML scratch-vm builds
 * from it (blocks.toXML + Comment.toXML + mutationToXML). Each snippet below is
 * that XML for a trimmed excerpt of the named authored fixture (ids shortened,
 * free text paraphrased), in the VM's emission order:
 *   - `<variables>` first, then workspace comments (blockId === null), then
 *     top-level blocks;
 *   - per block: `<comment>` (if block.comment resolves), `<mutation>`, one
 *     `<value>` per input (the VM writes statement inputs as `<value>` too;
 *     a real block before its obscured shadow), `<field>`s, `<next>`;
 *   - comment attributes: id, x, y, w, h, pinned (scratch-vm always writes
 *     "true" for block comments), minimized.
 *
 * `expect` describes what the loader must derive from the data:
 *   - invisible / visible: block ids whose isInvisible() must be true / false
 *     after loading into a non-developer-mode workspace;
 *   - useful: the workspace.getUsefulBlocks() list after loading, or null when
 *     the snippet has no define-exercise-blocks procedure (the loader then
 *     auto-creates one, see Blockly.Workspace#createExerciseBlocksCallback);
 *   - callWarp (optional): the warp attribute a procedures_call mutation
 *     serializes back to, when that differs from the input.
 *
 * Eras follow SHAPES.md's meta.vm classification. Hidden comments and the
 * define-exercise-blocks mutation only exist in 0.20.x data, so no 0.14.x
 * variants of those are invented here.
 */
'use strict';

/** The auto-created explanation on the define-exercise-blocks procedure. */
var FTRPRF_EXPLANATION = 'Drag here all the blocks that are useful for this ' +
    'exercise and those will only show these blocks to whoever is making the ' +
    'exercise. This block is automatically hidden.';

/** The define-exercise-blocks prototype mutation, exactly as saved. */
var FTRPRF_EXERCISE_MUTATION = '<mutation proccode="Exercise blocks" ' +
    'argumentids="[]" argumentnames="[]" argumentdefaults="[]" warp="false">' +
    '</mutation>';

/**
 * A define-exercise-blocks script as the VM emits it.
 * @param {string} id Definition block id.
 * @param {string} commentXml Optional `<comment>` element.
 * @param {string} nextXml Optional chain of useful blocks (inside `<next>`).
 * @return {string} XML.
 */
function ftrprfFixture_defineExerciseBlocks(id, commentXml, nextXml) {
  return '<block id="' + id + '" type="procedures_definition" x="-51" y="-167">' +
      (commentXml || '') +
      '<value name="custom_block">' +
      '<shadow id="' + id + '_proto" type="procedures_prototype">' +
      FTRPRF_EXERCISE_MUTATION +
      '</shadow></value>' +
      (nextXml ? '<next>' + nextXml + '</next>' : '') +
      '</block>';
}

/**
 * A procedures_call as the VM emits it (no arguments).
 * @param {string} id Block id.
 * @param {string} procCode The proccode.
 * @param {string=} opt_warp The warp attribute, omitted when undefined.
 * @param {string=} opt_nextXml Optional next block.
 * @return {string} XML.
 */
function ftrprfFixture_call(id, procCode, opt_warp, opt_nextXml) {
  return '<block id="' + id + '" type="procedures_call">' +
      '<mutation proccode="' + procCode + '" argumentids="[]"' +
      (opt_warp === undefined ? '' : ' warp="' + opt_warp + '"') +
      '></mutation>' +
      (opt_nextXml ? '<next>' + opt_nextXml + '</next>' : '') +
      '</block>';
}

/**
 * motion_movesteps with its math_number shadow, as the VM emits it.
 * @param {string} id Block id.
 * @param {string=} opt_nextXml Optional next block.
 * @return {string} XML.
 */
function ftrprfFixture_moveSteps(id, opt_nextXml) {
  return '<block id="' + id + '" type="motion_movesteps">' +
      '<value name="STEPS"><shadow id="' + id + '_n" type="math_number">' +
      '<field name="NUM">10</field></shadow></value>' +
      (opt_nextXml ? '<next>' + opt_nextXml + '</next>' : '') +
      '</block>';
}

/**
 * A `<comment>` element as scratch-vm's Comment.toXML writes it.
 * @param {string} id Comment id.
 * @param {string} text Comment text (already XML-escaped).
 * @param {boolean} minimized Minimized state.
 * @return {string} XML.
 */
function ftrprfFixture_comment(id, text, minimized) {
  return '<comment id="' + id + '" x="184" y="16" w="200" h="200" pinned="true"' +
      ' minimized="' + minimized + '">' + text + '</comment>';
}

/**
 * Wrap top-level content in the VM's workspace envelope.
 * @param {string} variablesXml `<variable>` elements, may be empty.
 * @param {string} bodyXml Workspace comments and top-level blocks.
 * @return {string} XML.
 */
function ftrprfFixture_xml(variablesXml, bodyXml) {
  return '<xml xmlns="http://www.w3.org/1999/xhtml"><variables>' +
      variablesXml + '</variables>' + bodyXml + '</xml>';
}

/** A hidden green-flag script: the shape most hidden comments sit on. */
function ftrprfFixture_hiddenFlagScript(commentText, minimized) {
  return '<block id="flag" type="event_whenflagclicked" x="176" y="5032">' +
      ftrprfFixture_comment('hc', commentText, minimized) +
      '<next>' + ftrprfFixture_moveSteps('move') + '</next></block>';
}

var FTRPRF_FIXTURES = [
  // ---------------------------------------------------------------- H.*
  {
    name: 'H_danglingBlockId',
    shape: 'H.dangling-blockId',
    era: '0.20.x',
    source: '2ca6aad762f5',
    // A comment whose blockId points at a block that is not in the target is
    // neither a block comment (no block references it) nor a workspace
    // comment (blockId !== null), so the VM emits nothing for it. What must
    // hold is that the surrounding scripts still load untouched.
    xml: ftrprfFixture_xml('',
        '<block id="flag" type="event_whenflagclicked" x="0" y="0">' +
        '<next>' + ftrprfFixture_moveSteps('move') + '</next></block>'),
    expect: {invisible: [], visible: ['flag', 'move'], useful: null}
  },
  {
    name: 'H_hiddenComment',
    shape: 'H.hidden-comment',
    era: '0.20.x',
    source: '23acebc742e5',
    xml: ftrprfFixture_xml('', ftrprfFixture_hiddenFlagScript('%hidden%', false)),
    expect: {invisible: ['flag', 'move', 'move_n'], visible: [], useful: null}
  },
  {
    name: 'H_minimized',
    shape: 'H.minimized',
    era: '0.20.x',
    source: '2ca6aad762f5',
    xml: ftrprfFixture_xml('', ftrprfFixture_hiddenFlagScript('%hidden%\n', true)),
    expect: {invisible: ['flag', 'move'], visible: [], useful: null}
  },
  {
    name: 'H_onBlockTopLevelHatOrDef',
    shape: 'H.on-block:top-level hat/def',
    era: '0.20.x',
    source: '612b3fb9e8c7',
    xml: ftrprfFixture_xml('',
        '<block id="def" type="procedures_definition" x="176" y="1688">' +
        ftrprfFixture_comment('hc', '%hidden%\n', true) +
        '<value name="custom_block"><shadow id="proto" type="procedures_prototype">' +
        '<mutation proccode="Drop Brandstof" argumentids="[]" argumentnames="[]" ' +
        'argumentdefaults="[]" warp="false"></mutation></shadow></value>' +
        '<next>' + ftrprfFixture_moveSteps('move') + '</next></block>' +
        '<block id="flag" type="event_whenflagclicked" x="176" y="2200">' +
        ftrprfFixture_comment('hc2', '%hidden%', false) + '</block>'),
    expect: {invisible: ['def', 'proto', 'move', 'flag'], visible: [], useful: null}
  },
  {
    name: 'H_rootOpcode_control_start_as_clone',
    shape: 'H.root-opcode:control_start_as_clone',
    era: '0.20.x',
    source: 'b43dcce294e8',
    xml: ftrprfFixture_xml('',
        '<block id="clone" type="control_start_as_clone" x="40" y="40">' +
        ftrprfFixture_comment('hc', '%hidden%', true) +
        '<next><block id="hide" type="looks_hide"></block></next></block>'),
    expect: {invisible: ['clone', 'hide'], visible: [], useful: null}
  },
  {
    name: 'H_rootOpcode_event_whenbroadcastreceived',
    shape: 'H.root-opcode:event_whenbroadcastreceived',
    era: '0.20.x',
    source: '4c447413536b',
    xml: ftrprfFixture_xml(
        '<variable type="broadcast_msg" id="msg1" islocal="false" ' +
        'iscloud="false">start</variable>',
        '<block id="recv" type="event_whenbroadcastreceived" x="40" y="40">' +
        ftrprfFixture_comment('hc', '%hidden%', true) +
        '<field name="BROADCAST_OPTION" id="msg1" variabletype="broadcast_msg">' +
        'start</field>' +
        '<next>' + ftrprfFixture_moveSteps('move') + '</next></block>'),
    expect: {invisible: ['recv', 'move'], visible: [], useful: null}
  },
  {
    name: 'H_rootOpcode_event_whenflagclicked',
    shape: 'H.root-opcode:event_whenflagclicked',
    era: '0.20.x',
    source: '700868ed7a51',
    xml: ftrprfFixture_xml('', ftrprfFixture_hiddenFlagScript('%hidden%', true)),
    expect: {invisible: ['flag', 'move'], visible: [], useful: null}
  },
  {
    name: 'H_rootOpcode_event_whenkeypressed',
    shape: 'H.root-opcode:event_whenkeypressed',
    era: '0.20.x',
    source: '2ca6aad762f5',
    xml: ftrprfFixture_xml('',
        '<block id="key" type="event_whenkeypressed" x="40" y="40">' +
        ftrprfFixture_comment('hc', '%hidden%', true) +
        '<field name="KEY_OPTION">space</field>' +
        '<next>' + ftrprfFixture_moveSteps('move') + '</next></block>'),
    expect: {invisible: ['key', 'move'], visible: [], useful: null}
  },
  {
    name: 'H_rootOpcode_event_whenthisspriteclicked',
    shape: 'H.root-opcode:event_whenthisspriteclicked',
    era: '0.20.x',
    source: '4c447413536b',
    xml: ftrprfFixture_xml('',
        '<block id="click" type="event_whenthisspriteclicked" x="40" y="40">' +
        ftrprfFixture_comment('hc', '%hidden%', true) +
        '<next><block id="show" type="looks_show"></block></next></block>'),
    expect: {invisible: ['click', 'show'], visible: [], useful: null}
  },
  {
    name: 'H_rootOpcode_procedures_definition',
    shape: 'H.root-opcode:procedures_definition',
    era: '0.20.x',
    source: '3136c16a0744',
    xml: ftrprfFixture_xml('',
        '<block id="def" type="procedures_definition" x="176" y="3184">' +
        ftrprfFixture_comment('hc', '%hidden%\n', true) +
        '<value name="custom_block"><shadow id="proto" type="procedures_prototype">' +
        '<mutation proccode="Ga Vakje naar Links" argumentids="[]" ' +
        'argumentnames="[]" argumentdefaults="[]" warp="false"></mutation>' +
        '</shadow></value>' +
        '<next><block id="left" type="motion_changexby">' +
        '<value name="DX"><shadow id="dx" type="math_number">' +
        '<field name="NUM">-40</field></shadow></value></block></next></block>' +
        '<block id="flag" type="event_whenflagclicked" x="0" y="0">' +
        '<next>' + ftrprfFixture_call('call', 'Ga Vakje naar Links', 'false') +
        '</next></block>'),
    // Only the hidden definition's group is hidden; the visible script that
    // calls it is not.
    expect: {invisible: ['def', 'left'], visible: ['flag', 'call'], useful: null}
  },
  {
    name: 'H_target_sprite',
    shape: 'H.target:sprite',
    era: '0.20.x',
    source: '8fbd818c07e0',
    // sprite vs stage is a VM-level distinction (one XML per editing target);
    // the Blockly XML is the same envelope either way.
    xml: ftrprfFixture_xml('', ftrprfFixture_hiddenFlagScript('%hidden%', true) +
        '<block id="other" type="event_whenthisspriteclicked" x="400" y="0">' +
        '<next><block id="say" type="looks_hide"></block></next></block>'),
    expect: {invisible: ['flag', 'move'], visible: ['other', 'say'], useful: null}
  },
  {
    name: 'H_target_stage',
    shape: 'H.target:stage',
    era: '0.20.x',
    source: '700868ed7a51',
    xml: ftrprfFixture_xml('',
        '<block id="flag" type="event_whenflagclicked" x="0" y="0">' +
        ftrprfFixture_comment('hc', '%hidden%', true) +
        '<next><block id="bd" type="looks_switchbackdropto">' +
        '<value name="BACKDROP"><shadow id="bdm" type="looks_backdrops">' +
        '<field name="BACKDROP">backdrop1</field></shadow></value>' +
        '</block></next></block>'),
    expect: {invisible: ['flag', 'bd', 'bdm'], visible: [], useful: null}
  },
  {
    name: 'H_text_bare',
    shape: 'H.text.bare',
    era: '0.20.x',
    source: '612b3fb9e8c7',
    xml: ftrprfFixture_xml('', ftrprfFixture_hiddenFlagScript('%hidden%', false)),
    expect: {invisible: ['flag', 'move'], visible: [], useful: null}
  },
  {
    name: 'H_text_withBody',
    shape: 'H.text.with-body',
    era: '0.20.x',
    source: '3136c16a0744',
    xml: ftrprfFixture_xml('', ftrprfFixture_hiddenFlagScript(
        '%hidden%\nDit script zet de sprite klaar voor de oefening.', false)),
    expect: {invisible: ['flag', 'move'], visible: [], useful: null}
  },
  {
    name: 'H_workspaceComment_blockIdNull',
    shape: 'H.workspace-comment(blockId=null)',
    era: '0.20.x',
    source: '3136c16a0744',
    // A workspace comment carrying the marker hides nothing: only block
    // comments drive setInvisible. It must round-trip as a workspace comment.
    xml: ftrprfFixture_xml('',
        '<comment id="wc" x="520" y="40" w="200" h="200" minimized="false">' +
        '%hidden%\nNotitie voor de leerkracht</comment>' +
        '<block id="flag" type="event_whenflagclicked" x="0" y="0">' +
        '<next>' + ftrprfFixture_moveSteps('move') + '</next></block>'),
    expect: {invisible: [], visible: ['flag', 'move'], useful: null}
  },

  // ---------------------------------------------------------------- D.*
  {
    name: 'D_chain_call',
    shape: 'D.chain:call',
    era: '0.20.x',
    source: '612b3fb9e8c7',
    xml: ftrprfFixture_xml('', ftrprfFixture_defineExerciseBlocks('def',
        ftrprfFixture_comment('hc', '%hidden%\n' + FTRPRF_EXPLANATION, false),
        ftrprfFixture_call('c1', 'Drop Brandstof', 'false',
            ftrprfFixture_call('c2', 'Drop Energie', 'false')))),
    expect: {invisible: ['def', 'c1', 'c2'], visible: [],
      useful: ['Drop Brandstof', 'Drop Energie']}
  },
  {
    name: 'D_chain_callAndStd',
    shape: 'D.chain:call+std',
    era: '0.20.x',
    source: '2ca6aad762f5',
    xml: ftrprfFixture_xml('', ftrprfFixture_defineExerciseBlocks('def',
        ftrprfFixture_comment('hc', '%hidden%\n' + FTRPRF_EXPLANATION, false),
        '<block id="rep" type="control_repeat">' +
        '<value name="TIMES"><shadow id="times" type="math_whole_number">' +
        '<field name="NUM">10</field></shadow></value>' +
        '<next>' + ftrprfFixture_call('c1', 'Drop Brandstof', 'false') +
        '</next></block>')),
    // Every descendant after the definition and its prototype counts, shadows
    // included -- the old fork's blocks.slice(2), kept as-is.
    expect: {invisible: ['def', 'rep', 'c1'], visible: [],
      useful: ['control_repeat', 'math_whole_number', 'Drop Brandstof']}
  },
  {
    name: 'D_chain_empty',
    shape: 'D.chain:empty',
    era: '0.20.x',
    source: '9c80c4344609',
    xml: ftrprfFixture_xml('', ftrprfFixture_defineExerciseBlocks('def',
        ftrprfFixture_comment('hc', FTRPRF_EXPLANATION, false), '')),
    expect: {invisible: ['def'], visible: [], useful: []}
  },
  {
    name: 'D_chain_std',
    shape: 'D.chain:std',
    era: '0.20.x',
    source: '23acebc742e5',
    xml: ftrprfFixture_xml('', ftrprfFixture_defineExerciseBlocks('def',
        ftrprfFixture_comment('hc', '%hidden%\n' + FTRPRF_EXPLANATION, false),
        ftrprfFixture_moveSteps('move',
            '<block id="turn" type="motion_turnright">' +
            '<value name="DEGREES"><shadow id="deg" type="math_number">' +
            '<field name="NUM">15</field></shadow></value></block>'))),
    expect: {invisible: ['def', 'move', 'turn'], visible: [],
      useful: ['motion_movesteps', 'math_number', 'motion_turnright',
        'math_number']}
  },
  {
    name: 'D_defComment_hiddenExplanation',
    shape: 'D.def-comment:hidden-explanation',
    era: '0.20.x',
    source: '8fbd818c07e0',
    xml: ftrprfFixture_xml('', ftrprfFixture_defineExerciseBlocks('def',
        ftrprfFixture_comment('hc', '%hidden%\n' + FTRPRF_EXPLANATION, false), '')),
    expect: {invisible: ['def'], visible: [], useful: []}
  },
  {
    name: 'D_defComment_none',
    shape: 'D.def-comment:none',
    era: '0.20.x',
    source: '700868ed7a51',
    xml: ftrprfFixture_xml('', ftrprfFixture_defineExerciseBlocks('def', '', '')),
    // Hidden for non-developers even without a marker comment: loading the
    // 'Exercise blocks' prototype into its definition hides the definition.
    expect: {invisible: ['def'], visible: [], useful: []}
  },
  {
    name: 'D_defComment_plain',
    shape: 'D.def-comment:plain',
    era: '0.20.x',
    source: '4c447413536b',
    xml: ftrprfFixture_xml('', ftrprfFixture_defineExerciseBlocks('def',
        ftrprfFixture_comment('hc', FTRPRF_EXPLANATION, false),
        ftrprfFixture_call('c1', 'Zet ruimteschip klaar', 'false'))),
    expect: {invisible: ['def', 'c1'], visible: [],
      useful: ['Zet ruimteschip klaar']}
  },
  {
    name: 'D_defineExerciseBlocks',
    shape: 'D.define-exercise-blocks',
    era: '0.20.x',
    source: 'b43dcce294e8',
    xml: ftrprfFixture_xml('', ftrprfFixture_defineExerciseBlocks('def',
        ftrprfFixture_comment('hc', '%hidden%\n' + FTRPRF_EXPLANATION, false),
        ftrprfFixture_call('c1', 'Drop Kogels', 'false')) +
        '<block id="flag" type="event_whenflagclicked" x="0" y="0">' +
        '<next>' + ftrprfFixture_moveSteps('move') + '</next></block>'),
    expect: {invisible: ['def', 'c1'], visible: ['flag', 'move'],
      useful: ['Drop Kogels']}
  },
  {
    name: 'D_proto_warpStr',
    shape: 'D.proto.warp:str',
    era: '0.20.x',
    source: '23acebc742e5',
    // warp="false" on the Exercise blocks prototype (FTRPRF_EXERCISE_MUTATION).
    xml: ftrprfFixture_xml('', ftrprfFixture_defineExerciseBlocks('def', '',
        ftrprfFixture_call('c1', 'Drop Medicijn', 'false'))),
    expect: {invisible: ['def', 'c1'], visible: [], useful: ['Drop Medicijn']}
  },

  // ---------------------------------------------------------------- P.*
  {
    name: 'P_argumentReporterBoolean',
    shape: 'P.argument_reporter_boolean',
    era: '0.14.x',
    source: 'synthetic (only real file is 3.8 MB, local corpus only)',
    xml: ftrprfFixture_xml('',
        '<block id="def" type="procedures_definition" x="2725" y="672">' +
        '<value name="custom_block"><shadow id="proto" type="procedures_prototype">' +
        '<mutation proccode="Spring als %b" argumentids="[&quot;argB&quot;]" ' +
        'argumentnames="[&quot;klaar&quot;]" argumentdefaults="[&quot;false&quot;]" ' +
        'warp="false"></mutation>' +
        '<value name="argB"><shadow id="protoArg" type="argument_reporter_boolean">' +
        '<field name="VALUE">klaar</field></shadow></value>' +
        '</shadow></value>' +
        '<next><block id="if" type="control_if">' +
        '<value name="CONDITION"><block id="arg" type="argument_reporter_boolean">' +
        '<field name="VALUE">klaar</field></block></value>' +
        '<value name="SUBSTACK">' + ftrprfFixture_moveSteps('move') + '</value>' +
        '</block></next></block>'),
    expect: {invisible: [], visible: ['def', 'if', 'arg', 'move'], useful: null}
  },
  {
    name: 'P_argumentReporterStringNumber',
    shape: 'P.argument_reporter_string_number',
    era: '0.14.x',
    source: '5c1accb0156e',
    xml: ftrprfFixture_xml('',
        '<block id="def" type="procedures_definition" x="2725" y="672">' +
        '<value name="custom_block"><shadow id="proto" type="procedures_prototype">' +
        '<mutation proccode="Draai %s graden naar %s" ' +
        'argumentids="[&quot;a1&quot;,&quot;a2&quot;]" ' +
        'argumentnames="[&quot;aantal&quot;,&quot;richting&quot;]" ' +
        'argumentdefaults="[&quot;&quot;,&quot;&quot;]" warp="false"></mutation>' +
        '<value name="a1"><shadow id="pa1" type="argument_reporter_string_number">' +
        '<field name="VALUE">aantal</field></shadow></value>' +
        '<value name="a2"><shadow id="pa2" type="argument_reporter_string_number">' +
        '<field name="VALUE">richting</field></shadow></value>' +
        '</shadow></value>' +
        '<next><block id="turn" type="motion_turnright">' +
        '<value name="DEGREES"><block id="arg" type="argument_reporter_string_number">' +
        '<field name="VALUE">aantal</field></block>' +
        '<shadow id="deg" type="math_number"><field name="NUM">15</field></shadow>' +
        '</value></block></next></block>'),
    expect: {invisible: [], visible: ['def', 'turn', 'arg'], useful: null}
  },
  {
    name: 'P_callKeys_noWarp',
    shape: 'P.call.keys:argumentids,children,proccode,tagName',
    era: '0.14.x',
    source: 'c7445b4ec87e',
    xml: ftrprfFixture_xml('',
        '<block id="flag" type="event_whenflagclicked" x="0" y="0">' +
        '<next>' + ftrprfFixture_call('call', 'Spring', undefined) + '</next></block>'),
    expect: {invisible: [], visible: ['flag', 'call'], useful: null,
      callWarp: 'null'}
  },
  {
    name: 'P_callKeys_withWarp',
    shape: 'P.call.keys:argumentids,children,proccode,tagName,warp',
    era: '0.14.x',
    source: '883d384a22db',
    xml: ftrprfFixture_xml('',
        '<block id="flag" type="event_whenflagclicked" x="0" y="0">' +
        '<next>' + ftrprfFixture_call('call', 'Spring', 'false') + '</next></block>'),
    expect: {invisible: [], visible: ['flag', 'call'], useful: null}
  },
  {
    name: 'P_call_warpAbsent',
    shape: 'P.call.warp:absent',
    era: '0.20.x',
    source: '612b3fb9e8c7',
    // A call without warp parses to warp_ = null and serializes back as
    // warp="null" (upstream callerMutationToDom; the VM treats it as false).
    xml: ftrprfFixture_xml('', ftrprfFixture_defineExerciseBlocks('def', '',
        ftrprfFixture_call('c1', 'Drop Energie', undefined))),
    expect: {invisible: ['def', 'c1'], visible: [], useful: ['Drop Energie'],
      callWarp: 'null'}
  },
  {
    name: 'P_call_warpStr',
    shape: 'P.call.warp:str',
    era: '0.20.x',
    source: '8fbd818c07e0',
    xml: ftrprfFixture_xml('', ftrprfFixture_defineExerciseBlocks('def', '', '') +
        '<block id="flag" type="event_whenflagclicked" x="0" y="0">' +
        '<next>' + ftrprfFixture_call('call', 'Spring', 'true') + '</next></block>'),
    expect: {invisible: ['def'], visible: ['flag', 'call'], useful: []}
  },
  {
    name: 'P_call_withArgs',
    shape: 'P.call.with-args',
    era: '0.20.x',
    source: '9c80c4344609',
    xml: ftrprfFixture_xml('', ftrprfFixture_defineExerciseBlocks('def', '', '') +
        '<block id="flag" type="event_whenflagclicked" x="0" y="0"><next>' +
        '<block id="call" type="procedures_call">' +
        '<mutation proccode="animeer van sprite # %n tot en met %n" ' +
        'argumentids="[&quot;input0&quot;,&quot;input1&quot;]" warp="null">' +
        '</mutation>' +
        '<value name="input0"><shadow id="n0" type="math_number">' +
        '<field name="NUM">9</field></shadow></value>' +
        '<value name="input1"><shadow id="n1" type="math_number">' +
        '<field name="NUM">12</field></shadow></value>' +
        '</block></next></block>'),
    expect: {invisible: ['def'], visible: ['flag', 'call'], useful: []}
  },
  {
    name: 'P_protoKeys_full',
    shape: 'P.proto.keys:argumentdefaults,argumentids,argumentnames,children,proccode,tagName,warp',
    era: '0.14.x',
    source: 'c7445b4ec87e',
    xml: ftrprfFixture_xml('',
        '<block id="def" type="procedures_definition" x="10" y="10">' +
        '<value name="custom_block"><shadow id="proto" type="procedures_prototype">' +
        '<mutation proccode="Spring" argumentids="[]" argumentnames="[]" ' +
        'argumentdefaults="[]" warp="false"></mutation></shadow></value>' +
        '<next>' + ftrprfFixture_moveSteps('move') + '</next></block>'),
    expect: {invisible: [], visible: ['def', 'move'], useful: null}
  },
  {
    name: 'P_proto_noArgs',
    shape: 'P.proto.no-args',
    era: '0.20.x',
    source: '700868ed7a51',
    xml: ftrprfFixture_xml('', ftrprfFixture_defineExerciseBlocks('def', '', '') +
        '<block id="def2" type="procedures_definition" x="10" y="400">' +
        '<value name="custom_block"><shadow id="proto2" type="procedures_prototype">' +
        '<mutation proccode="Zet klaar" argumentids="[]" argumentnames="[]" ' +
        'argumentdefaults="[]" warp="false"></mutation></shadow></value></block>'),
    expect: {invisible: ['def'], visible: ['def2'], useful: []}
  },
  {
    name: 'P_proto_warpBool',
    shape: 'P.proto.warp:bool',
    era: '0.14.x',
    source: 'c7445b4ec87e',
    // sb3 `warp: true` (boolean) and `warp: "true"` (string) both reach
    // Blockly as warp="true": the VM's mutationToXML stringifies attributes.
    xml: ftrprfFixture_xml('',
        '<block id="def" type="procedures_definition" x="10" y="10">' +
        '<value name="custom_block"><shadow id="proto" type="procedures_prototype">' +
        '<mutation proccode="Teken snel" argumentids="[]" argumentnames="[]" ' +
        'argumentdefaults="[]" warp="true"></mutation></shadow></value></block>'),
    expect: {invisible: [], visible: ['def'], useful: null}
  },
  {
    name: 'P_proto_warpStr',
    shape: 'P.proto.warp:str',
    era: '0.14.x',
    source: '883d384a22db',
    xml: ftrprfFixture_xml('',
        '<block id="def" type="procedures_definition" x="10" y="10">' +
        '<value name="custom_block"><shadow id="proto" type="procedures_prototype">' +
        '<mutation proccode="Spring" argumentids="[]" argumentnames="[]" ' +
        'argumentdefaults="[]" warp="false"></mutation></shadow></value></block>'),
    expect: {invisible: [], visible: ['def'], useful: null}
  },
  {
    name: 'P_proto_withArgs',
    shape: 'P.proto.with-args',
    era: '0.20.x',
    source: '9c80c4344609',
    xml: ftrprfFixture_xml('', ftrprfFixture_defineExerciseBlocks('dex', '', '') +
        '<block id="def" type="procedures_definition" x="5921" y="52">' +
        '<value name="custom_block"><shadow id="proto" type="procedures_prototype">' +
        '<mutation proccode="animeer van sprite # %n tot en met %n" ' +
        'argumentids="[&quot;input0&quot;,&quot;input1&quot;]" ' +
        'argumentnames="[&quot;#1&quot;,&quot;#2&quot;]" argumentdefaults="[1,1]" ' +
        'warp="false"></mutation>' +
        '<value name="input0"><shadow id="pa1" type="argument_reporter_string_number">' +
        '<field name="VALUE">#1</field></shadow></value>' +
        '<value name="input1"><shadow id="pa2" type="argument_reporter_string_number">' +
        '<field name="VALUE">#2</field></shadow></value>' +
        '</shadow></value>' +
        '<next><block id="wait" type="control_wait">' +
        '<value name="DURATION"><shadow id="dur" type="math_positive_number">' +
        '<field name="NUM">0.1</field></shadow></value></block></next></block>'),
    expect: {invisible: ['dex'], visible: ['def', 'wait'], useful: []}
  }
];
