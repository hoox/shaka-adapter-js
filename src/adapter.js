var youbora = require('youboralib')
var manifest = require('../manifest.json')

youbora.adapters.Shaka = youbora.Adapter.extend({

  constructor: function (player) {
    youbora.adapters.Shaka.__super__.constructor.call(this, player)
    this.tag = this.player.getMediaElement ? this.player.getMediaElement() : this.player.a
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
    if (this.flags.isPaused) return 0
    return this.player.getPlaybackRate() || 1
  },

  /** Override to return Frames Per Secon (FPS) */
  getFramesPerSecond: function () {
    if (this.player.getVariantTracks) {
      var tracks = this.player.getVariantTracks()
      for (var i in tracks) {
        var track = tracks[i]
        if (track.active && (track.type == "video" || track.type == "variant")) {
          return track.frameRate
        }
      }
    }
    return null
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
    var stats = this.player.getStats()
    if (typeof stats.streamBandwidth != "undefined") {
      return stats.streamBandwidth
    }
    if (typeof stats.streamStats != "undefined") {
      return stats.streamStats.videoBandwidth
    }
    return null
  },

  /** Override to return rendition */
  getRendition: function () {
    if (this.player.getVariantTracks) {
      var tracks = this.player.getVariantTracks()
      for (var i in tracks) {
        var track = tracks[i]
        if (track.active && (track.type == "video" || track.type == "variant")) {
          return youbora.Util.buildRenditionString(track.width, track.height, track.bandwidth)
        }
      }
    } else if (this.player.getVideoTracks) {
      var tracks = this.player.getVideoTracks()
      for (var i in tracks) {
        var track = tracks[i]
        if (track.active) {
          return youbora.Util.buildRenditionString(track.width, track.height, track.bandwidth)
        }
      }
    }
    return null
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
    return this.player.isLive() ? true : !this.getDuration()
  },

  /** Override to return resource URL. */
  getResource: function () {
    if (this.player.getAssetUri && this.player.getAssetUri()) {
      return this.player.getAssetUri()
    } else if (this.player.getManifestUri && this.player.getManifestUri()) {
      return this.player.getManifestUri()
    }
    return this.tag.currentSrc
  },

  /** Override to return player version */
  getPlayerVersion: function () {
    if (shaka.Player) {
      return shaka.Player.version
    } if (shaka.player) {
      return shaka.player.Player.version
    }
    return null
  },

  /** Override to return player's name */
  getPlayerName: function () {
    return "Shaka"
  },

  /** Register listeners to this.player. */
  registerListeners: function () {
    this.tag = this.player.getMediaElement ? this.player.getMediaElement() : this.player.a
    // Console all events if logLevel=DEBUG
    youbora.Util.logAllEvents(this.tag)

    // Enable playhead monitor (buffer = true, seek = false)
    this.monitorPlayhead(true, false)

    // References
    this.references = []
    this.referencesPlayer = []
    this.references['play'] = this.playListener.bind(this)
    this.references['loadstart'] = this.autoplayListener.bind(this)
    this.references['pause'] = this.pauseListener.bind(this)
    this.references['playing'] = this.playingListener.bind(this)
    //this.references['error'] = this.errorListener.bind(this)
    this.referencesPlayer['error'] = this.errorListener.bind(this)
    this.references['seeking'] = this.seekingListener.bind(this)
    this.references['seeked'] = this.seekedListener.bind(this)
    this.references['ended'] = this.endedListener.bind(this)

    // Register listeners
    for (var key in this.references) {
      this.tag.addEventListener(key, this.references[key])
    }
    for (var key in this.referencesPlayer) {
      this.player.addEventListener(key, this.referencesPlayer[key])
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
    if (this.getResource())
      this.fireStart()
  },

  /** Listener for 'play' event. */
  autoplayListener: function (e) {
    if (this.tag.autoplay) this.fireStart()
  },

  /** Listener for 'pause' event. */
  pauseListener: function (e) {
    this.firePause()
  },

  /** Listener for 'playing' event. */
  playingListener: function (e) {
    this.fireResume()
    this.fireStart()
    this.fireJoin()
  },

  /** Listener for 'error' event. */
  errorListener: function (e) {
    var msg = "unknown"
    // Error codes: https://shaka-player-demo.appspot.com/docs/api/shaka.util.Error.html
    if (e.category) {
      switch (e.category) {
        case 1:
          msg = "network"
          break
        case 2:
          msg = "text"
          break
        case 3:
          msg = "media"
          break
        case 4:
          msg = "manifest"
          break
        case 5:
          msg = "streaming"
          break
        case 6:
          msg = "drm"
          break
        case 7:
          msg = "player"
          break
        case 8:
          msg = "cast"
          break
        case 9:
          msg = "storage"
      }
    }
    if (e.detail && e.detail.code) {
      this.fireError(e.detail.code, msg)
    } else {
      this.fireError(e.code, msg)
    }
    if ((e.severity && e.severity === 2) || (e.detail.severity && e.detail.severity === 2)) { // Critical
      this.fireStop()
    }
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

module.exports = youbora.adapters.Shaka
