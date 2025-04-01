// operations.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError } from 'rxjs/operators';
import { Observable, of } from 'rxjs';

interface Operation {
  name: string;
  rute: string;
}

@Injectable({
  providedIn: 'root'
})
export class OperationsService {
  private baseUrl = 'http://localhost:3000/operaciones';

  constructor(private http: HttpClient) {}

  //GET

  searchOperacion(query: string): Observable<any[]> {
    
    return this.http.get<any[]>(`${this.baseUrl}/buscar?query=${query}`).pipe(
      catchError((error) => {
        if (error.status === 404) {
          return of([]);  // No hacer nada o devolver un valor vacío
        }
        return of([]);
      })
    );
  }

  getOperations(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/oper`);
  }  

  getOperationById(id: string): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/operation/${id}`);
  }

  getOperationsByProjects(id: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/getP/${id}`);
  }

  getOperationsByProject(projectId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/proyecto/${projectId}`).pipe(
      catchError(error => {
          if (error.status === 404) {
              console.log('No se encontraron operaciones para este proyecto');
              return of([]); // Esto devolverá un array vacío
          }
      })
    );
  }

  downloadFile(filename: string, name: string, id: number): Observable<Blob> {
    const url = `${this.baseUrl}/${filename}/${name}/${id}`;
    return this.http.get(url, { responseType: 'blob' });
  }

  //POST

  addOperation(formData: FormData): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}`, formData);
  }

  runScript(script: string, formData: FormData): Observable<any> {
    const body = {script,formData};
    return this.http.post<any>(`${this.baseUrl}/execute-script`, formData);
  }

  runOperation(rute: string, inputFilePath: string, outputFilePath: string, additionalText: string, id:any, name:string): Observable<any> {
    const body = { rute, inputFilePath, outputFilePath, additionalText, id, name};
    return this.http.post<any>(`${this.baseUrl}/run`, body);
  }

  saveOperations(operations: any[]): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/guardar`, operations);
  }

  removeOperationsFromProject(projectId: number, operationsToRemove: number[]): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/removeOperationsFromProject`, {
      projectId,
      operationsToRemove
    });
  }

  saveOperationsToProject(projectId: number, operations: any[],archivo:any): Observable<any> {
    const operationsData = operations.map((operation, index) => ({
      id_proyecto: projectId,
      id_operacion: operation.id,
      nombre_operacion: operation.operacion,
      archivo: archivo || null,
      orden: index + 1,
      confi: operation.confi,
      count: operation.count
    }));

    return this.http.post<any>(`${this.baseUrl}/saveOperations`, operationsData);
  }

  //PUT

  updateOperation(id: string, formData: FormData): Observable<any> {
    return this.http.put(`${this.baseUrl}/updateOperacion/${id}`, formData);
  }

  updateOperationsOrder(id:any,operations: any[]): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/update-order/${id}`, { operations });
  }

  //DELETE

  deleteOperacion(id: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/deleteOperacion/${id}`);
  }
}
