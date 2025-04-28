import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'richText', standalone: true }) // ✅ standalone se lo usi in componenti standalone
export class RichTextPipe implements PipeTransform {
  transform(value: string): string {
    if (!value) return '';

    // Trasforma link [testo](url)
    value = value.replace(
      /\[([^\]]+)\]\(([^)]+)\)/g,
      '<a href="$2" target="_blank">$1</a>'
    );

    // Trasforma immagini ![alt](url)
    value = value.replace(
      /!\[([^\]]*)\]\(([^)]+)\)/g,
      '<img src="$2" alt="$1" />'
    );

    return value;
  }
}
