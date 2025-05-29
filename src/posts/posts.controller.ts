import { Body, Controller, Get, Param, Post, Req } from '@nestjs/common';
import { PostsService } from './posts.service';
// import { CreateSessionDto } from './dto/create-session.dto';
// import { JoinSessionDto } from './dto/join-session.dto';

@Controller('posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  // @Post('/start')
  // start(@Req() req, @Body() dto: CreateSessionDto) {
  //   dto.clientIP = req.socket.remoteAddress;
  //   return this.sessionsService.start(dto);
  // }

  @Get(':page')
  get(@Param('page') page: number) {
    return this.postsService.getPosts(page);
  }
}
