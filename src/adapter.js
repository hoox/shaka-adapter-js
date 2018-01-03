var youbora = require('youboralib')
var manifest = require('../manifest.json')

youbora.adapters.Shaka2 = youbora.Adapter.extend({

  constructor: function (player) {
    youbora.adapters.Shaka2.__super__.constructor.call(this, player)
    this.tag = this.player.getMediaElement()
  },

  /** Override to return current plugin version */
  getVersion: function () {
    return manifest.version + '-' + manifest.name + '-' + manifest.tech
  },

  /** Override to return current playhead of the video */
  getPlayhead: function () {
    return this.tag.currentTime
  },

  /** Override to return current playrate */
  getPlayrate: function () {
    return this.player.getPlaybackRate()
  },

  /** Override to return Frames Per Secon (FPS) */
  getFramesPerSecond: function () {
    var tracks = this.player.getVariantTracks()
    for (var i in tracks) {
      var track = tracks[i]
      if (track.active && (track.type == "video" || track.type == "variant")) {
        return track.frameRate
      }
    }
  },

  /** Override to return dropped frames since start */
  getDroppedFrames: function () {
    return this.player.getStats().droppedFrames
  },

  /** Override to return video duration */
  getDuration: function () {
    return this.tag.duration
  },

  /** Override to return current bitrate */
  getBitrate: function () {
    return this.player.getStats().streamBandwidth
  },

  /** Override to return rendition */
  getRendition: function () {
    var tracks = this.player.getVariantTracks()
    for (var i in tracks) {
      var track = tracks[i]
      if (track.active && (track.type == "video" || track.type == "variant")) {
        return youbora.Util.buildRenditionString(track.width, track.height, track.bandwidth)
      }
    }
  },

  /** Override to return user bandwidth throughput */
  getThroughput: function () {
    return this.player.getStats().estimatedBandwidth
  },

  /** Override to return title */
  getTitle: function () {
    return this.tag.title
  },

  /** Override to recurn true if live and false if VOD */
  getIsLive: function () {
    return this.player.isLive()
  },

  /** Override to return resource URL. */
  getResource: function () {
    return this.player.getManifestUri()
  },

  /** Override to return player version */
  getPlayerVersion: function () {
    return shaka.Player.version
  },

  /** Override to return player's name */
  getPlayerName: function () {
    return "Shaka"
  },

  /** Register listeners to this.player. */
  registerListeners: function () {
    this.tag = this.player.getMediaElement()
    // Console all events if logLevel=DEBUG
    youbora.Util.logAllEvents(this.tag)

    // Enable playhead monitor (buffer = true, seek = false)
    this.monitorPlayhead(true, false)

    // References
    this.references = []
    this.references['play'] = this.playListener.bind(this)
    this.references['pause'] = this.pauseListener.bind(this)
    this.references['playing'] = this.playingListener.bind(this)
    this.references['error'] = this.errorListener.bind(this)
    this.references['seeking'] = this.seekingListener.bind(this)
    this.references['seeked'] = this.seekedListener.bind(this)
    this.references['ended'] = this.endedListener.bind(this)

    // Register listeners
    for (var key in this.references) {
      this.tag.addEventListener(key, this.references[key])
    }
  },

  /** Unregister listeners to this.player. */
  unregisterListeners: function () {
    // Disable playhead monitoring
    this.monitor.stop()

    // unregister listeners
    if (this.tag && this.references) {
      for (var key in this.references) {
        this.tag.removeEventListener(key, this.references[key])
      }
      this.references = []
    }
  },

  /** Listener for 'play' event. */
  playListener: function (e) {
    this.fireStart()
  },

  /** Listener for 'pause' event. */
  pauseListener: function (e) {
    this.firePause()
  },

  /** Listener for 'playing' event. */
  playingListener: function (e) {
    this.fireResume()
    this.fireJoin()
  },

  /** Listener for 'error' event. */
  errorListener: function (e) {
    this.fireError(e.detail.code)
  },

  /** Listener for 'seeking' event. */
  seekingListener: function (e) {
    this.fireSeekBegin()
  },

  /** Listener for 'seeked' event. */
  seekedListener: function (e) {
    this.fireSeekEnd()
  },

  /** Listener for 'ended' event. */
  endedListener: function (e) {
    this.fireStop()
  }
})

module.exports = youbora.adapters.Shaka2
