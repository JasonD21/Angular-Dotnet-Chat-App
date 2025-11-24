import { Component } from '@angular/core';

@Component({
  selector: 'typing-indicator',
  imports: [],
  template: ` <div class="flex items-center space-x-2">
    <span class="block text-sm text-gray-600">Typing ... </span>
    <div class="flex space-x-1.5">
      <div class="w-[5px] h-[5px] bg-gray-400 rounded-full animate-pulse"></div>
      <div class="w-[5px] h-[5px] bg-gray-400 rounded-full animate-pulse"></div>
      <div class="w-[5px] h-[5px] bg-gray-400 rounded-full animate-pulse"></div>
    </div>
  </div>`,
})
export class TypingIndicator {}
