export class UpdateSessionDto {
  status: sessionStatus = sessionStatus.transmitting;
  token: number = 0;
}

enum sessionStatus {
  started = 'STARTED',
  recieverJoined = 'JOINED',
  transmitting = 'TRANSMITTING',
  done = 'DONE',
  failed = 'FAILED',
}
