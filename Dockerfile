FROM emscripten/emsdk:3.1.40 AS builder

SHELL ["/bin/bash", "-o", "pipefail", "-c"]

ARG FFMPEG_VERSION=n5.1.4
ARG FFMPEG_WASM_VERSION=v0.12.10

ENV INSTALL_DIR=/opt
ENV FFMPEG_ST=1
ENV CFLAGS="-I/opt/include"
ENV CXXFLAGS="-I/opt/include"
ENV LDFLAGS="-L/opt/lib"

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
      git \
      pkg-config \
      ca-certificates && \
    rm -rf /var/lib/apt/lists/*

# Get pinned FFmpeg source.
RUN git clone --depth 1 \
      --branch "${FFMPEG_VERSION}" \
      https://github.com/FFmpeg/FFmpeg.git \
      /src/ffmpeg

# Get pinned FFmpeg.wasm wrapper source.
RUN git clone --depth 1 \
      --branch "${FFMPEG_WASM_VERSION}" \
      https://github.com/ffmpegwasm/ffmpeg.wasm.git \
      /src/ffmpeg-wasm

# Copy the custom configuration into the build image.
COPY build/ffmpeg-config.sh /src/ffmpeg-config.sh

# Prepare the FFmpeg.wasm wrapper files.
RUN mkdir -p /src/ffmpeg/src/bind \
             /src/ffmpeg/src/fftools \
             /src/ffmpeg/dist && \
    cp -a /src/ffmpeg-wasm/src/bind/. \
      /src/ffmpeg/src/bind/ && \
    cp -a /src/ffmpeg-wasm/src/fftools/. \
      /src/ffmpeg/src/fftools/

# Build FFmpeg with the custom audio-focused configuration.
WORKDIR /src/ffmpeg

RUN source /src/ffmpeg-config.sh && \
    emconfigure ./configure \
      --target-os=none \
      --arch=x86_32 \
      --enable-cross-compile \
      --disable-asm \
      --disable-stripping \
      --disable-programs \
      --disable-doc \
      --disable-debug \
      --disable-runtime-cpudetect \
      --disable-autodetect \
      --disable-pthreads \
      --disable-w32threads \
      --disable-os2threads \
      --nm=emnm \
      --ar=emar \
      --ranlib=emranlib \
      --cc=emcc \
      --cxx=em++ \
      --objcc=emcc \
      --dep-cc=emcc \
      --extra-cflags="${CFLAGS}" \
      --extra-cxxflags="${CXXFLAGS}" \
      "${FFMPEG_CUSTOM_CONFIG_FLAGS[@]}" && \
    emmake make -j2

# Prepare SDL2 and build the browser WASM core.
RUN embuilder build sdl2

RUN mkdir -p dist && \
    bash /src/ffmpeg-wasm/build/ffmpeg-wasm.sh \
      -o dist/ffmpeg-core.js

# Export only generated build artifacts.
FROM scratch AS export

COPY --from=builder /src/ffmpeg/dist /dist
