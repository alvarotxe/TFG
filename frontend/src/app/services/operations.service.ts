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

  duplicateOper(operation: any, id_proyecto: any): Observable<any> {
    // Aseguramos que id_proyecto está dentro del objeto 'operation'
    const operationWithProject = { ...operation, id_proyecto }; // Añadimos id_proyecto dentro del objeto operation
  
    // Ahora enviamos el objeto actualizado al backend
    return this.http.post<any>(`${this.baseUrl}/duplicar`, operationWithProject);
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
    return this.http.get<any[]>(`${this.baseUrl}/proyecto/${projectId}`).pipe(
      catchError(error => {
          // Si el error es un 404, puedes devolver un array vacío o realizar alguna otra acción
          if (error.status === 404) {
              console.log('No se encontraron operaciones para este proyecto');
              return of([]); // Esto devolverá un array vacío
          }
          // Si es otro tipo de error, lo manejas aquí
          // También puedes manejar otros errores de la misma manera
      })
    );
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
      confi: operation.confi,
      count: operation.count
    }));

    return this.http.post<any>(`${this.baseUrl}/saveOperations`, operationsData);
  }

  updateOperationsOrder(id:any,operations: any[]): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/update-order/${id}`, { operations });
  }
}
