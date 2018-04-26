# RPI Study Room Finder
## Team X
* Xinyue Yan
* Barry Chau
* Animesh Tripathy

## Overview
This application allows students to identify and register study room reservations across
campus. By logging in with their RCS ID, students will preserve their identities and have a built-in method
of authenticating their reservation. They will have 3 options: to view which rooms are currently available,
to reserve a room now or later period, or to set notifications for when a specific room is available. Through
usage of this app, Study Room Finder will serve as the time and energy efficient solution for finding open
study rooms on campus.

## Documentation
### /reserve
Attempts to reserve a room via provided parameters
* Request
  * apikey (string): optional when user is in active session
  * locationkey (string): specific location key
  * roomkey (string): specific room key
  * timeslot (integer): starting hour 0-23
  * date (string): format preferred MM/DD/YYYY
  * duration (integer): duration of reservation
* Response
  * lockey (string): same as locationkey
  * roomkey (string): specific room key
  * user (string): user who requested
  * success (boolean): whether reservation was successful
  * message (string): text describing the outcome
### /getAllLocations
Returns all locations
* Request
  * apikey (string): optional when user is in active session
* Response
  * success (boolean): whether getting locations was successful
  * data (object [])
    * locname (string): location name
    * floorplan (string): floor plan url
    * lockey (string): same as locationkey
    * numrooms (integer): number of rooms location has
### /getAllRooms
Returns all rooms
* Request
  * apikey (string): optional when user is in active session
* Response
  * success (boolean): whether getting rooms was successful
  * data (object [])
    * locname (string): location name
    * lockey (string): same as locationkey
    * roomkey (string): specific room key
    * roomnum (string): room number
    * maxseats (integer): maximum number of seats for room
### /getRoomSlotsByDate
Returns room slots for each hour of date requested
* Request
  * apikey (string): optional when user is in active session
  * locationkey (string): specific location key
  * roomkey (string): specific room key
  * date (string): format preferred MM/DD/YYYY
* Response
  * success (boolean): whether room slots were retrieved successfully
  * message (string): text describing the outcome only on false boolean
  * lockey (string): same as locationkey
  * roomkey (string): specific room key
  * requestedat (integer): epoch value in seconds for date of method call
  * requesteddate (string): MM/DD/YYYY formatted for date of method call
  * maxseats (integer): maximum number of seats for room
  * available (object [])
    * time (integer): starting hour 0-23
    * seatsleft (integer): number of seats left
### /getReservations
Returns reservations for requested user
* Request
  * apikey (string): optional when user is in active session
* Response
  * success (boolean): whether reservations were retrieved successfully
  * message (string): text describing the outcome only on false boolean
  * user (string): username of reservation holder
  * oreservations (object []): old/cancelled reservations
    * key (string): reservation key
    * name (string): location name
    * roomnum (string): room number
    * duration (integer): duration of reservation
    * date (string): format preferred MM/DD/YYYY
    * starttime (integer): starting time of reservation
    * status (integer): status of reservation (0-cancelled,1-scheduled,2-Completed)
  * freservations (object []): scheduled reservations
    * key (string): reservation key
    * name (string): location name
    * roomnum (string): room number
    * duration (integer): duration of reservation
    * date (string): format preferred MM/DD/YYYY
    * starttime (integer): starting time of reservation
    * status (integer): status of reservation (0-cancelled,1-scheduled,2-Completed)
### /cancelReservation
Cancels the specified reservation via key
* Request
  * apikey (string): optional when user is in active session
  * key (string): reservation key
* Response
  * success (boolean): whether cancellation was successfully
  * message (string): text describing the outcome only on false boolean
  * key (string): reservation key
### /getAllReservations
Returns all reservations (ADMIN ONLY)
* Request
  * apikey (string): optional when user is in active session
* Response
  * success (boolean): whether reservations were retrieved successfully
  * message (string): text describing the outcome only on false boolean
  * oreservations (object []): old/cancelled reservations
    * key (string): reservation key
    * user (string): username of reservation holder
    * name (string): location name
    * roomnum (string): room number
    * duration (integer): duration of reservation
    * date (string): format preferred MM/DD/YYYY
    * starttime (integer): starting time of reservation
    * status (integer): status of reservation (0-cancelled,1-scheduled,2-Completed)
  * freservations (object []): scheduled reservations
    * key (string): reservation key
    * user (string): username of reservation holder
    * name (string): location name
    * roomnum (string): room number
    * duration (integer): duration of reservation
    * date (string): format preferred MM/DD/YYYY
    * starttime (integer): starting time of reservation
    * status (integer): status of reservation (0-cancelled,1-scheduled,2-Completed)
### /addLocation
Add a new location (ADMIN ONLY)
* Request
  * apikey (string): optional when user is in active session
  * name (string): location name
  * floorplan (string): floor plan url
* Response
  * success (boolean): whether location addition was successfully
  * message (string): text describing the outcome only on false boolean
  * data (string): specific location key
### /addRoom
Add a new room (ADMIN ONLY)
* Request
  * apikey (string): optional when user is in active session
  * locationkey (string): specific location key
  * maxseats (integer): maximum number of seats for room
  * roomnum (string): room number
  * openhour (integer): opening time of room 0-23
  * closehour (integer): closing time of room 0-24
* Response
  * success (boolean): whether location addition was successfully
  * message (string): text describing the outcome only on false boolean
  * data (string): specific room key
