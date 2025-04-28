import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'smartText', standalone: true })
export class SmartTextPipe implements PipeTransform {
  transform(value: string): string {
    if (!value) return '';

    let result = value;

    // Trasforma immagini Markdown: ![alt](url)
    result = result.replace(
      /!\[([^\]]*)\]\(([^)]+)\)/g,
      `<img src="$2" alt="$1" class="inline-img">`
    );

    // Trasforma link Markdown: [testo](url)
    result = result.replace(
      /\[([^\]]+)\]\(([^)]+)\)/g,
      `<a href="$2" target="_blank">$1</a>`
    );

    // Trasforma link "https://..." non Markdown
    result = result.replace(
      /(?<!href="|">)((https?:\/\/[^\s<>"']+))/g,
      `<a href="$1" target="_blank">$1</a>`
    );

    return result;
  }
}
