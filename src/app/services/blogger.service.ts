import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class BloggerService {

  private apiKey = 'AIzaSyC3ws9P2fMAhK6w7W6TV9cn6bAk4RsF6Ko';
  private blogID = '5584682618555401483';
  private url = `https://www.googleapis.com/blogger/v3/blogs/${this.blogID}/posts`;

  constructor(private http: HttpClient) {}

  getPosts(): Observable<any> {
    return this.http.get(`${this.url}?key=${this.apiKey}&fetchBodies=true`);
  }

  getPostById(id: string): Observable<any> {
    return this.http.get(`${this.url}/${id}?key=${this.apiKey}`);
  }
}
