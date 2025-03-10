import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable,map,of,catchError} from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ProyectoService {
  private apiUrl = 'http://localhost:3000/proyectos'; 

  constructor(private http: HttpClient) {}


  //No esta implementado aún
  searchProyectos(query: string): Observable<any[]> {
    
    return this.http.get<any[]>(`${this.apiUrl}/buscar?query=${query}`).pipe(
      catchError((error) => {
        // Si no hay proyectos, puedes devolver un array vacío
        if (error.status === 404) {
          return of([]);  // No hacer nada o devolver un valor vacío
        }
        // Devolver el error para manejarlo en otro lugar si es necesario
        return of([]);
      })
    );
  }
  
  

  addProyecto(formData: FormData): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}`, formData);
  }

  getProyectos(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/proyecto`);
  }

  getProyectoById(id: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/p/${id}`);
  }

  updateProyecto(id: string, formData: FormData): Observable<any> {
    return this.http.put(`${this.apiUrl}/updateProyecto/${id}`, formData);
  }

  deleteProyecto(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/deleteProyecto/${id}`);
  }
}