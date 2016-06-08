var midi = null;  // global MIDIAccess object
var fileId = 0;
var globalSampleNumber = 0;

var midiMessageQueue = [];

$(function() {

  function sendMessage(){
    var index = parseInt(this.getAttribute("sampleNumber"));
    var midiMessage = midiMessageQueue[index];
    var sdsMessages = midiMessage.sdsMessages;
    var output = midi.outputs.get(midiMessage.portId);

    for(var messageId in sdsMessages){
      // debugMIDIMessage(sdsMessages[messageId]);
      output.send(sdsMessages[messageId]);
    }
    this.setAttribute("disabled", true);
  }

  function sendMessage2(){
    var index = parseInt(this.getAttribute("fileId"));
    var midiMessage = midiMessageQueue[index];
    var fileData = midiMessage.fileData;

    var sampleLength = new DataView(fileData.buffer).getInt32(40, true);
    var waveData = fileData.subarray(44, sampleLength);

    document.getElementById("step_three").style.display = "block";
    this.setAttribute("disabled", true);

    dumpSample2(midi,
                 document.getElementById("midi_port_select").value, // portID
                 document.getElementById("midi_channel_select").value, // channel
                 globalSampleNumber, // sampleNumber
                 waveData, // sampleData
                 sampleLength,
                 0, // loopStart
                 sampleLength/4-1, // loopEnd
                 0x7f);// loopType
    globalSampleNumber++;
  }

  function listInputsAndOutputs( midiAccess ) {

    midiAccess.outputs.forEach(function(output){
    //   console.log(output);
      // console.log( "Output port [type:'" + output.type + "'] id:'" + output.id +
      //   "' manufacturer:'" + output.manufacturer + "' name:'" + output.name +
      //   "' version:'" + output.version + "'" );
      var option = document.createElement("option");
      option.value = output.id;
      option.innerText = output.type + "|" + output.manufacturer + "|" + output.name + "|" + output.version;
      document.getElementById("midi_port_select").appendChild(option);
    });

    midiAccess.inputs.forEach(function(input){
      // console.log( "Input port [type:'" + input.type + "'] id:'" + input.id +
      //   "' manufacturer:'" + input.manufacturer + "' name:'" + input.name +
      //   "' version:'" + input.version + "'" );
      var option = document.createElement("option");
      option.value = input.id;
      option.innerText = input.type + "|" + input.manufacturer + "|" + input.name + "|" + input.version;
      document.getElementById("midi_port_select").appendChild(option);
    });

  }

function onMIDIMessage( event ) {
//   var str = "MIDI message received at timestamp " + event.timeStamp + "[" + event.data.length + " bytes]: ";
//   for (var i=0; i<event.data.length; i++) {
//      str += "0x" + event.data[i].toString(16) + " ";
//   }
//   console.log( str );
    var midiPacket = event.data;
    if(midiPacket[0] == 0xF0 && midiPacket[1] == 0x7E) {
      var str = "";
       for (var i=0; i<event.data.length; i++) {
         str += "0x" + event.data[i].toString(16) + " ";
       }
       console.log( str );

      var output = midi.outputs.get(document.getElementById("midi_port_select").value);
      if(midiPacket[3] == 0x7F) { // SDS ACK => F0 7E cc 7F nr F7
        appendLogMessage("Sample dump successful on channel:" + midiPacket[2] + " packet no:" + midiPacket[4]);
      }
      if(midiPacket[3] == 0x7E) { // SDS NACK => F0 7E cc 7E nr F7
        appendLogMessage("Sample dump FAILED on channel:" + midiPacket[2] + " packet no:" + midiPacket[4]);
      }
      if(midiPacket[3] == 0x7D) { // SDS CANCEL => F0 7E cc 7D nr F7
        appendLogMessage("CANCEL Sample dump on channel:" + midiPacket[2] + " packet no:" + midiPacket[4]);
      }
    }
}

function appendLogMessage(message) {
  var logArea = document.getElementById("midi_log");
  var p = document.createElement("p");
  p.innerText = message;
  logArea.insertBefore(p, logArea.firstChild);
}

function debugMIDIMessage(data) {
  var str = "";
  for (var i=0; i<data.length; i++) {
    str += "0x" + data[i].toString(16) + " ";
  }
  // appendLogMessage(str);
  console.log(str);
}

function startLoggingMIDIInput( midiAccess ) {
  midiAccess.inputs.forEach( function(entry) {entry.onmidimessage = onMIDIMessage;});
}

function onMIDISuccess( midiAccess ) {
  console.log( "MIDI ready!" );
  midi = midiAccess;  // store in the global (in real usage, would probably keep in an object instance)
  listInputsAndOutputs(midiAccess);
  startLoggingMIDIInput(midiAccess);
}

function onMIDIFailure(msg) {
  console.log( "Failed to get MIDI access - " + msg );
}

function FileDragHover(e) {
  e.stopPropagation();
  e.preventDefault();
  e.target.className = (e.type == "dragover" ? "hover" : "");
}
function FileSelectHandler(e) {
  FileDragHover(e);
  var files = e.target.files || e.dataTransfer.files;
  for (var i = 0, f; f = files[i]; i++) {
    var reader = new FileReader();
    console.log("File information: " + f.name +   " type: " + f.type +    " size: " + f.size +    " bytes");
    reader.onload = function(e) {
      var binary = new Uint8Array(e.target.result);

      var midiMessage = {
        fileData: new Uint8Array(e.target.result)
      };
      midiMessageQueue.push(midiMessage);

      // var sampleLength = new DataView(binary.buffer).getInt32(40, true);
      // var waveData = binary.subarray(44, sampleLength);
      // appendLogMessage("Sample length: " + sampleLength);
      // midiMessageQueue.push(dumpSample(midi,
    //             document.getElementById("midi_port_select").value, // portID
    //             document.getElementById("midi_channel_select").value, // channel
    //             0, // sampleNumber
    //             waveData, // sampleData
    //             sampleLength,
    //             0, // loopStart
    //             sampleLength/4-1, // loopEnd
    //             0x7f)// loopType
    //             );
      var button = document.createElement("button");
      button.innerText = "File: "+ this.name;
      button.setAttribute("fileId", fileId);
      button.addEventListener("click", sendMessage2);
      document.getElementById("sample_transfer_buttons").appendChild(button);
      document.getElementById("step_two").style.display = "block";
      fileId++;
    }.bind(f);
    reader.readAsArrayBuffer(f);
  }
}

if (window.File && window.FileList && window.FileReader) {
  var xhr = new XMLHttpRequest();
  if (xhr.upload) {
    filedrag = document.getElementById("drop_target")
    // file drop
    filedrag.addEventListener("dragover", FileDragHover, false);
    filedrag.addEventListener("dragleave", FileDragHover, false);
    filedrag.addEventListener("drop", FileSelectHandler, false);
    filedrag.style.display = "block";
  }
}
navigator.requestMIDIAccess( { sysex: true } ).then( onMIDISuccess, onMIDIFailure );

// SDS: http://www.4front-tech.com/pguide/midi/midi8.html && http://www.personal.kent.edu/~sbirch/Music_Production/MP-II/MIDI/midi_sample_dump_standard_messag.htm

function swap32(val) {
    return ((val & 0xFF) << 24)
           | ((val & 0xFF00) << 8)
           | ((val >> 8) & 0xFF00)
           | ((val >> 24) & 0xFF);
}

function lsbFirstWord(input) {

  var msb = (input >> 7) & 0x7F;
  var lsb = input & 0x7F;

  return [lsb, msb];
}

//0x5D BF => 0x3F 0x3B 0x01.
//0x58 94 => 0x14 0x31 0x01
function lsbFirstExpanded(input) {
  var msb = (input >> 14) & 0x3F;
  var csb = (input >> 7) & 0x7F;
  var lsb = input & 0x7F;

  return [lsb, csb, msb];
}
// 34789 ==> 67, 121, 32
// 0x87E5 ==> 0x437920
function sampleWordTo24Bits(input) {
  var msb = (input >> 9) & 0x7F;
  var csb = (input & 0x0100) >> 2 | (input & 0xFF) >> 2;
  var lsb = (input & 0x03) << 5;

  return [msb, csb, lsb];
}

function sdsHeader(channel, sampleNumber, sampleFormat, samplePeriod, sampleLength, loopStart, loopEnd, loopType) {

  var header = new Uint8Array(21);

  header.set([0xF0, 0x7E],0);
  header.set([channel],2);
  header.set([0x01],3);
  header.set(lsbFirstWord(sampleNumber), 4);
  header.set([sampleFormat], 6);
  header.set([0x14, 0x31, 0x01], 7); // samplePeriod (1/sample_rate) in nanoseconds 0x14 0x31 0x01 => (1/44100) * 1 000 000 000
  header.set(lsbFirstExpanded(sampleLength),10);
  header.set(lsbFirstExpanded(loopStart), 13);
  header.set(lsbFirstExpanded(loopEnd), 16);
  header.set([loopType], 19);
  header.set([0xF7], 20);

  return header;
}

// F0 7E cc 02 nr <120 bytes of encoded data> cs F7

function dumpDataPacket(channel, packetNumber, data) {
  var header = new Uint8Array(127);

  header.set([0xF0, 0x7E],    0);
  header.set([channel],       2);
  header.set([0x02],          3);
  header.set([packetNumber], 4);
  header.set( data,           5);
  header.set([header.subarray(1).reduce(function(a,b) { return a ^ b;}, 0)], 125);
  header.set([0xF7],          126);

  return header;
}

function dumpSample(midi, portId, channel, sampleNumber, sampleData, sampleLength, loopStart, loopEnd, loopType) {
  var packetNumber = 0;
  var currentBytePointer = 0;
  // var output = midi.outputs.get(portId);
  var midiMessage = {
    portId: portId,
    sampleNumber: sampleNumber,
    sdsMessages: []
  };

  // debugMIDIMessage(sdsHeader(channel, sampleNumber, 16, 44100, sampleLength/4, loopStart, loopEnd, loopType));
  // output.send(sdsHeader(channel, sampleNumber, 16, 44100, sampleLength/4, loopStart, loopEnd, loopType));
  midiMessage.sdsMessages.push(sdsHeader(channel, sampleNumber, 16, 44100, sampleLength/4, loopStart, loopEnd, loopType));

  while(currentBytePointer < sampleLength) {
    var dataToTransmit = new Uint8Array(120);

    for(var i = 0; i< 40; i = i+1) {
      var sampleLeft1 = sampleData[currentBytePointer+ ( 4 * i )];
      var sampleLeft2 = sampleData[currentBytePointer+ ( 4 * i ) + 1];
      var sampleLeft = (sampleLeft2 << 8 | sampleLeft1) + 0x8000;
      var sampleRight = (sampleData[currentBytePointer+ ( 4 * i ) + 2] | (sampleData[currentBytePointer+ ( 4 * i ) + 3] << 8)) + 0x8000;

      dataToTransmit.set(sampleWordTo24Bits(sampleLeft), i*3);
    }
    // debugMIDIMessage(sampleData.subarray(0,40));
    // debugMIDIMessage(dataToTransmit);

    // output.send(dumpDataPacket(channel, packetNumber, dataToTransmit));
    midiMessage.sdsMessages.push(dumpDataPacket(channel, packetNumber, dataToTransmit));
    currentBytePointer += 160;
    packetNumber = (packetNumber + 1) & 0x7F;
  }
  return midiMessage;
}

function dumpSample2(midi, portId, channel, sampleNumber, sampleData, sampleLength, loopStart, loopEnd, loopType) {
  var packetNumber = 0;
  var currentBytePointer = 0;
  var output = midi.outputs.get(portId);

  output.send(sdsHeader(channel, sampleNumber, 16, 44100, sampleLength/4, loopStart, loopEnd, loopType));

  while(currentBytePointer < sampleLength) {
    var dataToTransmit = new Uint8Array(120);

    for(var i = 0; i< 40; i = i+1) {
      var sampleLeft1 = sampleData[currentBytePointer+ ( 4 * i )];
      var sampleLeft2 = sampleData[currentBytePointer+ ( 4 * i ) + 1];
      var sampleLeft = (sampleLeft2 << 8 | sampleLeft1) + 0x8000;
      var sampleRight = (sampleData[currentBytePointer+ ( 4 * i ) + 2] | (sampleData[currentBytePointer+ ( 4 * i ) + 3] << 8)) + 0x8000;

      dataToTransmit.set(sampleWordTo24Bits(sampleLeft), i*3);
    }

    output.send(dumpDataPacket(channel, packetNumber, dataToTransmit));
    currentBytePointer += 160;
    packetNumber = (packetNumber + 1) & 0x7F;
  }
}

// SYSEX to update edit buffer on DPM v3
// F0 00 00 1B 02 02 01 00 pp

// Drum kit receive
// Header:
// F0 00 00 1B 02 02 cc 04
// Struct: Header + Kit: [ { pieces: [](32) } ](10)
// Peace:
// 00 Piece Wave 0-110 internal + 32 SDS RAM waves
// 01 Piece Top key: A0-A9
// 02 Piece Tune Value: +/- 36 semitones
// 03 Piece Decay Time: 0-99
// 04 Piece Pan Assignment: +/- 99
// 05 Piece Output Level: 0-99
// 06 Piece Fx2 Send: 0-99
// 07 Piece Out Assign: 0-2 [1+2,3+4,5+6]
});
