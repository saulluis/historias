import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { BloggerService } from '../services/blogger.service';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-foro-detalle',
  templateUrl: './foro-detalle.component.html',
  styleUrls: ['./foro-detalle.component.scss'],
  imports: [DatePipe, FormsModule]
})
export class ForoDetalleComponent implements OnInit {

  post: any;
  loading = true;
  comments: { author: string; text: string; date: string; imageUrl?: string }[] = [];
  imageUrlError: string | null = null;
  newComment = { author: '', text: '', imageUrl: '' };

  constructor(
    private route: ActivatedRoute,
    private bloggerService: BloggerService
  ) {}

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.bloggerService.getPostById(id).subscribe(res => {
      this.post = res;
      this.loading = false;
      this.loadComments();
    });
  }

  private storageKey(): string {
    return `foro_comments_${this.post?.id}`;
  }

  loadComments() {
    try {
      const raw = localStorage.getItem(this.storageKey());
      this.comments = raw ? JSON.parse(raw) : [];
    } catch {
      this.comments = [];
    }
  }

  saveComments() {
    localStorage.setItem(this.storageKey(), JSON.stringify(this.comments));
  }

  async addComment() {
    const author = (this.newComment.author || '').trim();
    const text = (this.newComment.text || '').trim();
    const imageUrl = (this.newComment.imageUrl || '').trim();
    if (!text) {
      return;
    }
    // Validar URL de imagen si viene
    if (imageUrl) {
      const ok = await this.validateImageUrl(imageUrl);
      if (!ok) {
        this.imageUrlError = 'El enlace no parece ser una imagen válida.';
        return;
      } else {
        this.imageUrlError = null;
      }
    }
    const entry = {
      author: author || 'Anónimo',
      text,
      date: new Date().toISOString(),
      imageUrl: imageUrl || undefined
    };
    this.comments = [entry, ...this.comments];
    this.saveComments();
    this.newComment.text = '';
    this.newComment.imageUrl = '';
  }

  // Verifica si la URL carga como imagen creando un objeto Image
  validateImageUrl(url: string): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        const img = new Image();
        img.onload = () => resolve(true);
        img.onerror = () => resolve(false);
        // Evitar problemas de cache
        const testUrl = url.includes('?') ? `${url}&_v=${Date.now()}` : `${url}?_v=${Date.now()}`;
        img.src = testUrl;
      } catch {
        resolve(false);
      }
    });
  }
}
