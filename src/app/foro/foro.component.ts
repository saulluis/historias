import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { BloggerService } from '../services/blogger.service';
@Component({
  selector: 'app-foro',
  templateUrl: './foro.component.html',
  styleUrls: ['./foro.component.scss'],
  imports: []
})
export class ForoComponent implements OnInit {

  posts: any[] = [];
  loading = true;

  constructor(
    private bloggerService: BloggerService,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadPosts();
  }

  loadPosts() {
    this.bloggerService.getPosts().subscribe((data: any) => {
      this.posts = data.items || [];
      this.loading = false;
    });
  }

  openPost(id: string) {
    this.router.navigate(['tabs/foro', id]);
  }
}
