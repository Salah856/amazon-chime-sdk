// Copyright 2020-2021 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import {
  VideoTileGrid,
  UserActivityProvider,
} from 'amazon-chime-sdk-component-library-react';

import { StyledLayout, StyledContent } from './Styled';
import NavigationControl from '../../containers/Navigation/NavigationControl';
import { useNavigation } from '../../providers/NavigationProvider';
import MeetingDetails from '../../containers/MeetingDetails';
import MeetingControls from '../../containers/MeetingControls';
import useMeetingEndRedirect from '../../hooks/useMeetingEndRedirect';
import DynamicMeetingControls from '../../containers/DynamicMeetingControls';
import { MeetingMode, VideoGridMode } from '../../types';
import { VideoGridProvider } from '../../providers/VideoGridProvider';
import { useAppState } from '../../providers/AppStateProvider';

const MeetingView = (props: { mode: MeetingMode }) => {
  useMeetingEndRedirect();
  const { showNavbar, showRoster } = useNavigation();
  const { mode } = props;
  const { videoGridMode } = useAppState();

  return (
    <UserActivityProvider>
      <VideoGridProvider>
        <StyledLayout showNav={showNavbar} showRoster={showRoster}>
          <StyledContent>
            <VideoTileGrid
              layout={
                videoGridMode === VideoGridMode.GalleryView
                  ? 'standard'
                  : 'featured'
              }
              className="videos"
              noRemoteVideoView={<MeetingDetails />}
            />
            {mode === MeetingMode.Spectator ? (
              <DynamicMeetingControls />
            ) : (
              <MeetingControls />
            )}
          </StyledContent>
          <NavigationControl />
        </StyledLayout>
      </VideoGridProvider>
    </UserActivityProvider>
  );
};

export default MeetingView;
