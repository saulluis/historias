import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable } from 'rxjs';
import { ServiceAPI } from '../services/service-api';

interface InfoHome {
  id: number;
  historia: string;
  vision: string;
  imageUrl: string; // base64
  maestroMezcal: string;
  mision: string;
  valores: string;
  normasProduccion: string;
  numeroContacto: number;
  ubicacion: string;
  createdAt: string;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
})
export class HomeComponent implements OnInit {
  infoHome$!: Observable<InfoHome[]>;

  constructor(private api: ServiceAPI) {}

  ngOnInit(): void {
    this.infoHome$ = this.api.findAllInfoHome();
  }
}
