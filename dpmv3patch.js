var midi = null;

$(function() {
  function sendMessage(){
    var patchParams = [];
    var portId = document.getElementById("midi_port_select").value;
    var channel = document.getElementById("midi_channel_select").value;
    var patchNumber = document.getElementsByName("patch_number").item(0).value;
    var output = midi.outputs.get(portId);

    // var nodesArray = Array.prototype.slice.call(document.querySelectorAll("div"));

    var patchName = document.getElementsByName("patch_name").item(0).value;

    for(var i = 0; i < 13; i++){
      if(patchName[i] == undefined)
        patchParams.push(0x00);
      else
        patchParams.push(patchName[i]);
    }

    for(var i = 13; i < 237; i++){
      var input = document.querySelectorAll("input[data-id='"+i+"']");
      if(input == undefined)
        patchParams.push(0x00);
      else
        patchParams.push(input.value);
    }
    output.send(sendPatch(channel, patchNumber, patchParams));
  }

  function listInputsAndOutputs( midiAccess ) {
    midiAccess.outputs.forEach(function(output){
      var option = document.createElement("option");
      option.value = output.id;
      option.innerText = output.type + "|" + output.manufacturer + "|" + output.name + "|" + output.version;
      document.getElementById("midi_port_select").appendChild(option);
    });

    midiAccess.inputs.forEach(function(input){
      var option = document.createElement("option");
      option.value = input.id;
      option.innerText = input.type + "|" + input.manufacturer + "|" + input.name + "|" + input.version;
      document.getElementById("midi_port_select").appendChild(option);
    });

  }

  function appendLogMessage(message) {
    var logArea = document.getElementById("midi_log");
    var p = document.createElement("p");
    p.innerText = message;
    logArea.insertBefore(p, logArea.firstChild);
  }

  function onMIDISuccess( midiAccess ) {
    appendLogMessage("MIDI ready!");
    midi = midiAccess;  // store in the global (in real usage, would probably keep in an object instance)
    listInputsAndOutputs(midiAccess);
  }

  function onMIDIFailure(msg) {
    appendLogMessage("Failed to get MIDI access - " + msg);
  }

  function sendPatch(channel, patchNumber, patchData) {
    receiveProgramCommandByte = 0x00;
    var header = new Uint8Array(9 + 237);

    header.set([0xF0, 0x00, 0x00, 0x1B, 0x02, 0x02], 0);
    header.set([channel], 6);
    header.set([receiveProgramCommandByte, patchNumber], 7);
    header.set( patchData, 9);

    return header;
  }

  function receivePatch(channel, patchNumber) {
    dumpProgramCommandByte = 0x01;
    var header = new Uint8Array(9 + 237);

    header.set([0xF0, 0x00, 0x00, 0x1B, 0x02, 0x02], 0);
    header.set([channel], 6);
    header.set([dumpProgramCommandByte, patchNumber], 7);

    return header;
  }

  document.getElementsByName("patch_number").item(0).addEventListener("change", function(){
    var channel = document.getElementById("midi_channel_select").value;
    receivePatch(channel, parseInt(this.value));
  });

  if(navigator.requestMIDIAccess != undefined) {
    navigator.requestMIDIAccess( { sysex: true } ).then( onMIDISuccess, onMIDIFailure );
  } else {
    alert("Your browser is probably not supported. Please try Chrome.");
  }
});
