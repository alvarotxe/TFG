import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable,map,of,catchError} from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ProyectoService {
  private baseUrl = 'http://localhost:3000/proyectos'; 

  constructor(private http: HttpClient) {}

  //GET

  searchProyectos(query: string): Observable<any[]> {
    
    return this.http.get<any[]>(`${this.baseUrl}/buscar?query=${query}`).pipe(
      catchError((error) => {
        if (error.status === 404) {
          return of([]);  // No hacer nada o devolver un valor vacío
        }
        return of([]);
      })
    );
  }

  getProyectos(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/proyecto`);
  }

  getProyectoById(id: string): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/p/${id}`);
  }

  downloadFile(filename: string, name: string, id: number): Observable<Blob> {
    const fileUrl = `${this.baseUrl}/download/${filename}/${name}/${id}`;
    return this.http.get(fileUrl, { responseType: 'blob' });
  }

  //POST

  addProyecto(formData: FormData): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}`, formData);
  }

  duplicateProyecto(id: string): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/duplicar/${id}`, {});
  }

  //PUT

  updateProyecto(id: string, formData: FormData): Observable<any> {
    return this.http.put(`${this.baseUrl}/updateProyecto/${id}`, formData);
  }

  //DELETE

  deleteProyecto(id: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/deleteProyecto/${id}`);
  }
}