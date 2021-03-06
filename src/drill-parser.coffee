# drill block parser class
# keeps track of format stuff
# has a parseCommand method that takes a block and acts accordingly

# generic parser
Parser = require './parser'
# parse coordinate function
parseCoord = require './coord-parser'
# get integer function
getSvgCoord = require('./svg-coord').get

# some command constants
INCH_COMMAND = { 'FMAT,1': 'M70', 'FMAT,2': 'M72'}
METRIC_COMMAND = 'M71'
ABS_COMMAND = 'G90'
INC_COMMAND = 'G91'

# drill coordinate
reCOORD = /[XY]{1,2}/

# backup zero suppression and format
ZERO_BACKUP = 'L'
PLACES_BACKUP = [ 2, 4 ]

class DrillParser extends Parser
  constructor: ->
    # excellon format of the drill file
    # I don't think this is ever going to be used because it's old but whatever
    @fmat = 'FMAT,2'
    # call parent constructor
    super(arguments[0])

  # parse a command block and return a command object
  parseCommand: (block) ->
    command = {}
    # check for comment
    if block[0] is ';' then return command

    # format 1 command
    # this will likely never happen
    if block is 'FMAT,1' then @fmat = block
    # end of file
    else if block is 'M30' or block is 'M00' then command.set = {done: true}
    # inches command
    else if block is INCH_COMMAND[@fmat] or block.match /INCH/
      # set the format to 2.4
      @format.places ?= [2, 4]
      # add set units object
      command.set = { units: 'in' }
    # metric command
    else if block is METRIC_COMMAND or block.match /METRIC/
      # set the format to 3.3
      @format.places ?= [3, 3]
      # add set units command object
      command.set = {units: 'mm'}
    # absolute notation
    else if block is ABS_COMMAND then command.set = {notation: 'A'}
    # incremental notation
    else if block is INC_COMMAND then command.set = {notation: 'I'}

    # tool definition
    else if ( code = block.match(/T\d+/)?[0] )
      # remove leading zeros from tool code
      code = code[0] + code[2..] while code[1] is '0'
      # issue a create tool command or a set tool command
      if ( dia = block.match(/C[\d\.]+(?=.*$)/)?[0] )
        dia = dia[1..]
        command.tool = {}
        command.tool[code] = { dia: getSvgCoord dia, { places: @format.places }}
      else
        command.set = { currentTool: code }

    # allow this to be tacked on the end of a command to be lenient
    # drill file specifies keep rather than suppress, so flip for consistency
    # with gerber files
    if block.match /TZ/
      @format.zero ?= 'L'
    else if block.match /LZ/
      @format.zero ?= 'T'

    # finally, check for a drill command
    # some drill files may tack on tool changes at the end of files, so we'll
    # put this at the end, so any tool change will happen first
    if block.match reCOORD
      command.op = { do: 'flash' }
      # check for zero suppression
      unless @format.zero?
        console.warn 'no drill file zero suppression specified. assuming
          leading zero suppression (same as no zero suppression)'
        @format.zero = ZERO_BACKUP
      # check for format
      unless @format.places?
        console.warn 'no drill file units specified; assuming 2:4 inches format'
        @format.places = PLACES_BACKUP
      command.op[k] = v for k, v of parseCoord block, @format

    # return the command
    command

# export
module.exports = DrillParser
