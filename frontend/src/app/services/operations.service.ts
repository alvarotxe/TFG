// operations.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

interface Operation {
  name: string;
  rute: string;
}

@Injectable({
  providedIn: 'root'
})
export class OperationsService {
  private apiUrl = 'assets/activities.json';
  private baseUrl = 'http://localhost:3000/operaciones';  // Ruta al archivo JSON en la carpeta assets

  constructor(private http: HttpClient) {}

  addOperation(formData: FormData): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}`, formData);
  }

  deleteOperacion(id: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/deleteOperacion/${id}`);
  }

  updateOperation(id: string, formData: FormData): Observable<any> {
    return this.http.put(`${this.baseUrl}/updateOperacion/${id}`, formData);
  }
  // Método para obtener las operaciones desde el archivo JSON
  getOperations(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/oper`);  // Incluir 'name' en la URL
  }  

  getOperationById(id: string): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/operation/${id}`);  // Incluir 'name' en la URL
  }

  deletePreviousEntries(proyectoId: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/delete/${proyectoId}`);
  }

  saveOperations(operations: any[]): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/guardar`, operations);
  }

  runScript(script: string, formData: FormData): Observable<any> {
    const body = {script,formData};
    return this.http.post<any>(`${this.baseUrl}/execute-script`, formData);
  }  

  runOperation(rute: string, inputFilePath: string, outputFilePath: string, additionalText: string, id:any, name:string): Observable<any> {
    const body = { rute, inputFilePath, outputFilePath, additionalText, id, name};
    return this.http.post<any>(`${this.baseUrl}/run`, body);
  }

  getOperationsByProjects(id: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/getP/${id}`);
  }

  getOperationsByProject(projectId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/proyecto/${projectId}`);
  }

  removeOperationsFromProject(projectId: number, operationsToRemove: number[]): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/removeOperationsFromProject`, {
      projectId,
      operationsToRemove
    });
}

  // Método para guardar las operaciones seleccionadas en la tabla `proyecto_operacion`
  saveOperationsToProject(projectId: number, operations: any[],archivo:any): Observable<any> {
    const operationsData = operations.map((operation, index) => ({
      id_proyecto: projectId,
      id_operacion: operation.id,  // Asumiendo que tienes un `id` para cada operación
      nombre_operacion: operation.operacion,
      archivo: archivo || null,  // Asumiendo que tienes un campo de archivo si aplica
      orden: index + 1,  // El orden es el índice + 1
      confi: operation.confi
    }));

    return this.http.post<any>(`${this.baseUrl}/saveOperations`, operationsData);
  }

  updateOperationsOrder(id:any,operations: any[]): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/update-order/${id}`, { operations });
  }
}
