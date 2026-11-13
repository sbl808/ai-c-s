#!/usr/bin/env bash
set -euo pipefail

# Minimal FFmpeg configuration for browser-side video-to-audio extraction.
# This file is intended to be sourced by the FFmpeg build process.

FFMPEG_CUSTOM_CONFIG_FLAGS=(
  --disable-everything
  --enable-small

  # Input containers
  --enable-demuxer=mov
  --enable-demuxer=matroska
  --enable-demuxer=wav
  --enable-demuxer=mp3
  --enable-demuxer=aac
  --enable-demuxer=ogg
  --enable-demuxer=flac

  # Audio decoders
  --enable-decoder=aac
  --enable-decoder=mp3
  --enable-decoder=opus
  --enable-decoder=vorbis
  --enable-decoder=flac
  --enable-decoder=alac
  --enable-decoder=ac3
  --enable-decoder=pcm_s16le
  --enable-decoder=pcm_s24le

  # Audio parsers
  --enable-parser=aac
  --enable-parser=mpegaudio
  --enable-parser=opus
  --enable-parser=vorbis
  --enable-parser=flac
  --enable-parser=alac
  --enable-parser=ac3

  # Audio filters
  --enable-filter=abuffer
  --enable-filter=abuffersink
  --enable-filter=anull

  # AAC output
  --enable-encoder=aac
  --enable-muxer=adts

  # Local browser virtual filesystem only
  --enable-protocol=file

  # Keep network access disabled.
  # Keep avdevice, avfilter and swscale libraries enabled
  # because the upstream ffmpeg-wasm linker references them.
  --disable-network
)
