// Copyright 2020-2021 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import {
  useActiveSpeakersState,
  useAudioVideo,
  useContentShareState,
  useLocalVideo,
  useMeetingManager,
  useRosterState,
} from 'amazon-chime-sdk-component-library-react';
import {
  AudioVideoObserver,
  VideoDownlinkObserver,
  VideoSource,
} from 'amazon-chime-sdk-js';
import React, { createContext, useContext, useEffect, useReducer } from 'react';
import { priorityBasedPolicy } from '../../meetingConfig';
import { VideoGridMode } from '../../types';
import { useAppState } from '../AppStateProvider';
import {
  Controls,
  initialState,
  reducer,
  State,
  VideoGridAction,
} from './state';

const VideoGridStateContext = createContext<State | null>(null);
const VideoGridControlsContext = createContext<Controls | null>(null);

const VideoGridProvider: React.FC = ({ children }) => {
  const audioVideo = useAudioVideo();
  const meetingManager = useMeetingManager();
  const [state, dispatch] = useReducer(reducer, initialState);
  const { roster } = useRosterState();
  const { videoGridMode, setVideoGridMode } = useAppState();
  const { isVideoEnabled } = useLocalVideo();
  const { isLocalUserSharing, sharingAttendeeId } = useContentShareState();
  const activeSpeakers = useActiveSpeakersState();

  useEffect(() => {
    if (!audioVideo) {
      return;
    }

    dispatch({
      type: VideoGridAction.UpdateAttendeeStates,
      payload: { roster },
    });
  }, [audioVideo, roster]);

  useEffect(() => {
    if (!audioVideo) {
      return;
    }

    return (): void => dispatch({ type: VideoGridAction.ResetVideoGridState });
  }, [audioVideo]);

  useEffect(() => {
    if (!audioVideo) {
      return;
    }

    dispatch({
      type: VideoGridAction.UpdateActiveSpeakers,
      payload: {
        activeSpeakers,
      },
    });
  }, [activeSpeakers, audioVideo]);

  useEffect(() => {
    if (!audioVideo) {
      return;
    }

    const observer: AudioVideoObserver = {
      remoteVideoSourcesDidChange: (videoSources: VideoSource[]): void => {
        dispatch({
          type: VideoGridAction.UpdateVideoSources,
          payload: { videoSources },
        });
      },
    };

    audioVideo.addObserver(observer);

    return (): void => audioVideo.removeObserver(observer);
  }, [audioVideo]);

  useEffect(() => {
    if (!priorityBasedPolicy || !audioVideo) {
      return;
    }

    const observer: VideoDownlinkObserver = {
      tileWillBePausedByDownlinkPolicy: (tileId: number): void => {
        const attendeeId = audioVideo.getVideoTile(tileId)?.state().boundAttendeeId;
        if (attendeeId) {
          dispatch({
            type: VideoGridAction.PauseVideoTile,
            payload: { attendeeId },
          });
        }
      },
      tileWillBeUnpausedByDownlinkPolicy: (tileId: number): void => {
        const attendeeId = audioVideo.getVideoTile(tileId)?.state().boundAttendeeId;
        if (attendeeId) {
          dispatch({
            type: VideoGridAction.UnpauseVideoTile,
            payload: { attendeeId },
          });
        }
      },
    };

    priorityBasedPolicy.addObserver(observer);

    return (): void => priorityBasedPolicy.removeObserver(observer);
  }, [audioVideo]);

  useEffect(() => {
    if (!audioVideo) {
      return;
    }

    const localAttendeeId =
      meetingManager.meetingSession?.configuration.credentials?.attendeeId ||
      null;

    dispatch({
      type: VideoGridAction.UpdateLocalSourceState,
      payload: {
        isVideoEnabled,
        localAttendeeId,
        isLocalUserSharing,
        sharingAttendeeId,
      },
    });
  }, [
    audioVideo,
    isLocalUserSharing,
    isVideoEnabled,
    meetingManager.meetingSession,
    sharingAttendeeId,
  ]);

  useEffect(() => {
    if (!audioVideo) {
      return;
    }

    dispatch({
      type: VideoGridAction.UpdateGridState,
      payload: {
        videoGridMode,
      },
    });
  }, [audioVideo, videoGridMode]);

  useEffect(() => {
    if (!audioVideo) {
      return;
    }

    if (sharingAttendeeId && videoGridMode === VideoGridMode.GalleryView) {
      setVideoGridMode(VideoGridMode.FeaturedView);
    }
  }, [audioVideo, setVideoGridMode, sharingAttendeeId, videoGridMode]);

  const zoomIn = (): void => dispatch({ type: VideoGridAction.ZoomIn });

  const zoomOut = (): void => dispatch({ type: VideoGridAction.ZoomOut });

  const controls: Controls = {
    zoomIn,
    zoomOut,
  };

  return (
    <VideoGridStateContext.Provider value={state}>
      <VideoGridControlsContext.Provider value={controls}>
        {children}
      </VideoGridControlsContext.Provider>
    </VideoGridStateContext.Provider>
  );
};

const useVideoGridState = (): State => {
  const state = useContext(VideoGridStateContext);

  if (!state) {
    throw new Error(
      'useVideoGridState must be used within a VideoGridStateProvider'
    );
  }

  return state;
};
const useVideoGridControls = (): Controls => {
  const context = useContext(VideoGridControlsContext);

  if (!context) {
    throw new Error(
      'useVideoGridControls must be used within VideoGridProvider'
    );
  }
  return context;
};
export { VideoGridProvider, useVideoGridState, useVideoGridControls };
