import { Body, Controller, Get, Param, Post, Query, Req } from '@nestjs/common';
import { PostsService } from './posts.service';
import { postCategory } from './entities/posts.entity';
import { query } from 'express';

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
  get(
    @Req() req,
    @Param('page') page: number,
    @Query('category') category: postCategory,
  ) {
    return this.postsService.getPosts(page, req.user.userId, category);
  }

  @Get('explore/:page')
  explore(
    @Req() req,
    @Param('page') page: number,
    @Query('category') category: postCategory,
  ) {
    return this.postsService.getPosts(page, null, category);
  }

  @Get('analize/:id')
  analize(@Req() req, @Param('id') id: string) {
    return this.postsService.analize(id, req.ip);
  }
}
