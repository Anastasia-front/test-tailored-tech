import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

// Used on endpoints that behave differently for logged-in vs anonymous users
// (e.g. viewing a public share link) but never reject the request outright.
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  handleRequest(_err: any, user: any) {
    return user || null;
  }
}
