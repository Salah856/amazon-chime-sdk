// Copyright 2020-2021 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';

import {
  Navbar,
  NavbarHeader,
  NavbarItem,
  Attendees,
  Eye,
  SignalStrength,
  Flex,
  ZoomIn,
  ZoomOut,
  useContentShareState,
} from 'amazon-chime-sdk-component-library-react';

import { useNavigation } from '../../providers/NavigationProvider';
import { useAppState } from '../../providers/AppStateProvider';
import { LocalMediaStreamMetrics } from '../LocalMediaStreamMetrics';
import { VideoGridMode } from '../../types';
import GalleryLayout from '../../components/Icons/GalleryLayout';
import FeaturedLayout from '../../components/Icons/FeaturedLayout';
import { useVideoGridControls } from '../../providers/VideoGridProvider';

const Navigation: React.FC = () => {
  const { toggleRoster, closeNavbar } = useNavigation();
  const { theme, toggleTheme, videoGridMode, setVideoGridMode } = useAppState();
  const { sharingAttendeeId } = useContentShareState();
  const { zoomIn, zoomOut } = useVideoGridControls();

  return (
    <Navbar className="nav" flexDirection="column" container>
      <NavbarHeader title="Navigation" onClose={closeNavbar} />
      <Flex css="margin-top: 0rem;">
        <NavbarItem
          icon={<Attendees />}
          onClick={toggleRoster}
          label="Attendees"
        />
        <NavbarItem
          icon={
            videoGridMode === VideoGridMode.GalleryView ? (
              <FeaturedLayout />
            ) : (
              <GalleryLayout />
            )
          }
          onClick={(): void => {
            if (videoGridMode === VideoGridMode.GalleryView) {
              setVideoGridMode(VideoGridMode.FeaturedView);
            } else {
              setVideoGridMode(VideoGridMode.GalleryView);
            }
          }}
          disabled={!!sharingAttendeeId}
          label="Switch View"
        />
        <NavbarItem
          icon={<ZoomIn />}
          onClick={zoomIn}
          label="Zoom In"
          style={{
            display:
              videoGridMode === VideoGridMode.GalleryView ? 'flex' : 'none',
          }}
          disabled={!!sharingAttendeeId}
        />
        <NavbarItem
          icon={<ZoomOut />}
          onClick={zoomOut}
          label="Zoom Out"
          style={{
            display:
              videoGridMode === VideoGridMode.GalleryView ? 'flex' : 'none',
          }}
        />
      </Flex>
      <Flex marginTop="auto">
        <NavbarItem
          icon={<Eye />}
          onClick={toggleTheme}
          label={theme === 'light' ? 'Dark mode' : 'Light mode'}
        />
        <NavbarItem
          icon={<SignalStrength />}
          onClick={(): void => {
            // do nothing
          }}
          label="Media metrics"
        >
          <LocalMediaStreamMetrics />
        </NavbarItem>
      </Flex>
    </Navbar>
  );
};

export default Navigation;
