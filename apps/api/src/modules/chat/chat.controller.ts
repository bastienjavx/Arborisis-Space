import { Body, Controller, Delete, Get, Param, Post, Query } from '@nestjs/common';
import {
  ChatScope,
  deleteChatMessageSchema,
  sendChatMessageSchema,
  type ChatContactView,
  type ChatMessageView,
  type SendChatMessageDto,
  type DeleteChatMessageDto,
} from '@arborisis/shared';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { ChatService } from './chat.service';

@Controller('chat')
export class ChatController {
  constructor(private readonly chat: ChatService) {}

  @Get('messages')
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query('scope') rawScope = ChatScope.GLOBAL,
    @Query('peerId') peerId?: string,
  ): Promise<ChatMessageView[]> {
    const scope = Object.values(ChatScope).includes(rawScope as ChatScope)
      ? (rawScope as ChatScope)
      : ChatScope.GLOBAL;
    return this.chat.list(user.id, scope, peerId);
  }

  @Post('messages')
  send(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(sendChatMessageSchema)) dto: SendChatMessageDto,
  ): Promise<ChatMessageView> {
    return this.chat.send(user.id, dto);
  }

  @Delete('messages/:id')
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(deleteChatMessageSchema)) body: DeleteChatMessageDto,
  ): Promise<void> {
    return this.chat.remove(user.id, id, body.reason);
  }

  @Get('contacts')
  contacts(
    @CurrentUser() user: AuthenticatedUser,
    @Query('search') search = '',
  ): Promise<ChatContactView[]> {
    return this.chat.contacts(user.id, search.trim());
  }
}
