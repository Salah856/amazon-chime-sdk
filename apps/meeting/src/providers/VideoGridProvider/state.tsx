import {
  DefaultModality,
  TargetDisplaySize,
  VideoPreference,
  VideoPreferences,
  VideoSource,
} from 'amazon-chime-sdk-js';
import { priorityBasedPolicy } from '../../meetingConfig';
import { VideoGridMode } from '../../types';

interface GridState {
  mode: VideoGridMode;
  isZoomed: boolean;
  threshold: number;
}

interface AttendeeState {
  attendeeId: string;
  name: string;
  videoEnabled: boolean;
  bandwidthConstrained: boolean;
}
interface VideoSourceState {
  cameraSources: string[];
  activeSpeakersWithCameraSource: string[];
  contentShareId: string | null;
  hasLocalVideo: boolean;
  hasLocalContentSharing: boolean;
}

type VideoSourceWithType = { attendeeId: string; type: string };

export type State = {
  gridState: GridState;
  attendeeStates: { [attendeeId: string]: AttendeeState };
  videoSourceState: VideoSourceState;
};

export const initialState: State = {
  gridState: {
    mode: VideoGridMode.GalleryView,
    isZoomed: false,
    threshold: 8,
  },
  attendeeStates: {},
  videoSourceState: {
    cameraSources: [],
    activeSpeakersWithCameraSource: [],
    contentShareId: null,
    hasLocalVideo: false,
    hasLocalContentSharing: false,
  },
};

export type RosterAttendeeType = {
  chimeAttendeeId: string;
  externalUserId?: string;
  name?: string;
};

export type RosterType = {
  [attendeeId: string]: RosterAttendeeType;
};

export type Controls = {
  zoomIn: () => void;
  zoomOut: () => void;
};

export enum VideoGridAction {
  ResetVideoGridState,
  UpdateAttendeeStates,
  UpdateVideoSources,
  UpdateActiveSpeakers,
  UpdateLocalSourceState,
  UpdateGridState,
  PauseVideoTile,
  UnpauseVideoTile,
  ZoomIn,
  ZoomOut,
}

type ResetVideoGridState = {
  type: VideoGridAction.ResetVideoGridState;
  payload?: any;
};

type UpdateVideoSources = {
  type: VideoGridAction.UpdateVideoSources;
  payload: {
    videoSources: VideoSource[];
  };
};

type UpdateActiveSpeakers = {
  type: VideoGridAction.UpdateActiveSpeakers;
  payload: {
    activeSpeakers: string[];
  };
};

type UpdateGridState = {
  type: VideoGridAction.UpdateGridState;
  payload: {
    videoGridMode: VideoGridMode;
  };
};

type UpdateAttendeeStates = {
  type: VideoGridAction.UpdateAttendeeStates;
  payload: {
    roster: RosterType;
  };
};

type UpdateLocalSourceState = {
  type: VideoGridAction.UpdateLocalSourceState;
  payload: {
    isVideoEnabled: boolean;
    localAttendeeId: string | null;
    isLocalUserSharing: boolean;
    sharingAttendeeId: string | null;
  };
};

type PauseVideoTile = {
  type: VideoGridAction.PauseVideoTile;
  payload: {
    attendeeId: string;
  };
};

type UnpauseVideoTile = {
  type: VideoGridAction.UnpauseVideoTile;
  payload: {
    attendeeId: string;
  };
};

type ZoomIn = {
  type: VideoGridAction.ZoomIn;
  payload?: any;
};

type ZoomOut = {
  type: VideoGridAction.ZoomOut;
  payload?: any;
};

export type Action =
  | UpdateVideoSources
  | ResetVideoGridState
  | UpdateGridState
  | UpdateAttendeeStates
  | UpdateLocalSourceState
  | UpdateActiveSpeakers
  | PauseVideoTile
  | UnpauseVideoTile
  | ZoomIn
  | ZoomOut;

const isContentShare = (sourceId: string): boolean =>
  new DefaultModality(sourceId).hasModality(DefaultModality.MODALITY_CONTENT);

const calculateVideoSourcesToBeRendered = (
  gridState: GridState,
  videoSourceState: VideoSourceState,
  attendeeStates: { [attendeeId: string]: AttendeeState }
): VideoSourceWithType[] => {
  const { mode, isZoomed, threshold } = gridState;
  const {
    activeSpeakersWithCameraSource,
    cameraSources,
    contentShareId,
    hasLocalVideo,
  } = videoSourceState;
  const videoSources: VideoSourceWithType[] = [];
  let commonSources: string[];

  // First, add content share
  for (const attendeeId of Object.keys(attendeeStates)) {
    if (isContentShare(attendeeId) && attendeeStates[attendeeId].videoEnabled) {
      videoSources.push({ attendeeId, type: 'contentShare' });
    }
  }

  // Second, add active speakers
  let activeSpeakers: string[] = [];
  let maximumNumberOfActiveSpeakers = 0;

  if (activeSpeakersWithCameraSource.length > 0) {

    if (mode === VideoGridMode.GalleryView) {
      maximumNumberOfActiveSpeakers = 1;
    }
    if (mode === VideoGridMode.FeaturedView) {
      maximumNumberOfActiveSpeakers =
        4 - (hasLocalVideo ? 1 : 0) - (contentShareId ? 1 : 0);
    }

    activeSpeakers = activeSpeakersWithCameraSource.slice(0, maximumNumberOfActiveSpeakers);

    videoSources.push(
      ...activeSpeakers.map(attendeeId => ({
        attendeeId,
        type: 'activeSpeaker',
      }))
    );

    commonSources = cameraSources.filter(
      id => !activeSpeakers.includes(id)
    );
  } else {
    commonSources = cameraSources;
  }


  // Last, add common video sources
  let gridSize = 0;

  if (mode === VideoGridMode.GalleryView) {
    if (isZoomed) {
      gridSize = threshold;
    } else {
      gridSize = Number.MAX_SAFE_INTEGER;
    }
  }

  if (mode === VideoGridMode.FeaturedView) {
    gridSize = 4;
  }

  const numberOfAvailableTiles = gridSize - (hasLocalVideo ? 1 : 0) - (contentShareId ? 1 : 0) - activeSpeakers.length;

  videoSources.push(
    ...commonSources
      .slice(0, numberOfAvailableTiles)
      .map(attendeeId => ({ attendeeId, type: 'common' }))
  );

  return videoSources;
};

const updateDownlinkPreferences = (
  gridState: GridState,
  videoSourceState: VideoSourceState,
  attendeeStates: { [attendeeId: string]: AttendeeState }
): void => {
  const { mode, threshold } = gridState;
  const { hasLocalVideo } = videoSourceState;
  const videoPreferences = VideoPreferences.prepare();
  let targetDisplaySize: TargetDisplaySize;

  const videoSourcesToBeRendered = calculateVideoSourcesToBeRendered(
    gridState,
    videoSourceState,
    attendeeStates
  );

  const numberOfTiles =
    videoSourcesToBeRendered.length + (hasLocalVideo ? 1 : 0);

  if (numberOfTiles <= threshold) {
    targetDisplaySize = TargetDisplaySize.High;
  } else {
    targetDisplaySize = TargetDisplaySize.Low;
  }

  for (const videoSource of videoSourcesToBeRendered) {
    const { attendeeId, type } = videoSource;

    // Prioritize Content Share
    if (type === 'contentShare') {
      videoPreferences.add(
        new VideoPreference(attendeeId, 1, TargetDisplaySize.High)
      );
    }

    // Prioritize Active Speakers
    if (type === 'activeSpeaker') {
      videoPreferences.add(
        new VideoPreference(
          attendeeId,
          1,
          mode === VideoGridMode.FeaturedView
            ? TargetDisplaySize.High
            : targetDisplaySize
        )
      );
    }

    // Set the common tiles to low priority
    if (type === 'common') {
      videoPreferences.add(
        new VideoPreference(attendeeId, 2, targetDisplaySize)
      );
    }
  }
  priorityBasedPolicy.chooseRemoteVideoSources(videoPreferences.build());
};

export function reducer(state: State, { type, payload }: Action): State {
  const { gridState, attendeeStates, videoSourceState } = state;

  switch (type) {
    case VideoGridAction.ResetVideoGridState: {
      return initialState;
    }
    case VideoGridAction.UpdateAttendeeStates: {
      const { roster } = payload;

      // Remove attendee that left the meeting
      for (const attendeeId of Object.keys(attendeeStates)) {
        if (!isContentShare(attendeeId) && !(attendeeId in roster)) {
          delete attendeeStates[attendeeId];
        }
      }

      // Add attendee that joined the meeting
      for (const attendeeId of Object.keys(roster)) {
        const name = roster[attendeeId]?.name || '';

        if (attendeeId in attendeeStates) {
          attendeeStates[attendeeId].name = name;
        } else {
          attendeeStates[attendeeId] = {
            attendeeId,
            name,
            videoEnabled: false,
            bandwidthConstrained: false,
          } as AttendeeState;
        }
      }

      // Ensure the state of `videoEnabled` in the racing condition of UpdateAttendeeStates and UpdateVideoSources
      // To do: Merge all the update actions to one
      for (const attendeeId of videoSourceState.cameraSources) {
        if (attendeeId in attendeeStates) {
          attendeeStates[attendeeId].videoEnabled = true;
        }
      }

      return {
        ...state,
        attendeeStates,
      };
    }
    case VideoGridAction.UpdateVideoSources: {
      const { videoSources } = payload as { videoSources: VideoSource[] };
      const cameraSources: string[] = [];
      const videoSourceIds = videoSources.map(
        videoSource => videoSource.attendee.attendeeId
      );

      // Reset the `videoEnabled` of all attendeeStates
      for (const attendee of Object.values(attendeeStates)) {
        attendee.videoEnabled = false;
      }

      // Remove content share from attendeeStates,
      // if content share is not in video sources
      for (const attendeeId of Object.keys(attendeeStates)) {
        if (
          isContentShare(attendeeId) &&
          !videoSourceIds.includes(attendeeId)
        ) {
          delete attendeeStates[attendeeId];
        }
      }

      // Update the `videoEnabled` according to video sources
      for (const attendeeId of videoSourceIds) {
        if (!(attendeeId in attendeeStates)) {
          if (isContentShare(attendeeId)) {
            attendeeStates[attendeeId] = {
              attendeeId,
              name: 'content share',
              bandwidthConstrained: false,
            } as AttendeeState;
          } else {
            attendeeStates[attendeeId] = {
              attendeeId,
              name: '',
              bandwidthConstrained: false,
            } as AttendeeState;
          }
        }

        attendeeStates[attendeeId].videoEnabled = true;
      }

      // Populate the `cameraSources` based on the order of attendeeStates
      for (const attendee of Object.values(attendeeStates)) {
        if (attendee.videoEnabled && !isContentShare(attendee.attendeeId)) {
          cameraSources.push(attendee.attendeeId);
        }
      }

      videoSourceState.cameraSources = cameraSources;
      updateDownlinkPreferences(gridState, videoSourceState, attendeeStates);

      return {
        ...state,
        attendeeStates,
        videoSourceState,
      };
    }
    case VideoGridAction.UpdateActiveSpeakers: {
      const { activeSpeakers } = payload;
      const activeSpeakersWithCameraSource = [];
      const { cameraSources } = videoSourceState;

      for (const attendeeId of activeSpeakers) {
        if (
          attendeeStates[attendeeId]?.videoEnabled &&
          cameraSources.includes(attendeeId)
        ) {
          activeSpeakersWithCameraSource.push(attendeeId);
        }
      }

      videoSourceState.activeSpeakersWithCameraSource = activeSpeakersWithCameraSource;
      updateDownlinkPreferences(gridState, videoSourceState, attendeeStates);

      return {
        ...state,
        videoSourceState,
      };
    }
    case VideoGridAction.UpdateLocalSourceState: {
      const {
        isVideoEnabled,
        localAttendeeId,
        isLocalUserSharing,
        sharingAttendeeId,
      } = payload;

      videoSourceState.hasLocalVideo = isVideoEnabled;
      videoSourceState.hasLocalContentSharing = isLocalUserSharing;
      videoSourceState.contentShareId = sharingAttendeeId;

      if (localAttendeeId && localAttendeeId in attendeeStates) {
        attendeeStates[localAttendeeId].videoEnabled = isVideoEnabled;
      }

      updateDownlinkPreferences(gridState, videoSourceState, attendeeStates);

      return {
        ...state,
        attendeeStates,
        videoSourceState,
      };
    }
    case VideoGridAction.UpdateGridState: {
      const { videoGridMode } = payload;
      gridState.mode = videoGridMode;
      updateDownlinkPreferences(gridState, videoSourceState, attendeeStates);

      return {
        ...state,
        gridState,
      };
    }
    case VideoGridAction.PauseVideoTile: {
      const { attendeeId } = payload;
      attendeeStates[attendeeId].bandwidthConstrained = true;

      return {
        ...state,
        attendeeStates,
      };
    }
    case VideoGridAction.UnpauseVideoTile: {
      const { attendeeId } = payload;
      attendeeStates[attendeeId].bandwidthConstrained = false;

      return {
        ...state,
        attendeeStates,
      };
    }
    case VideoGridAction.ZoomIn: {
      const { threshold } = gridState;
      const { cameraSources, hasLocalVideo } = videoSourceState;
      const numberOfTiles = cameraSources.length + (hasLocalVideo ? 1 : 0);

      if (numberOfTiles > threshold) {
        gridState.isZoomed = true;
        updateDownlinkPreferences(gridState, videoSourceState, attendeeStates);
      }

      return {
        ...state,
        gridState,
      };
    }
    case VideoGridAction.ZoomOut: {
      if (gridState.isZoomed) {
        gridState.isZoomed = false;
        updateDownlinkPreferences(gridState, videoSourceState, attendeeStates);
      }

      return {
        ...state,
      };
    }
    default:
      throw new Error('Incorrect type in VideoGridStateProvider');
  }
}
