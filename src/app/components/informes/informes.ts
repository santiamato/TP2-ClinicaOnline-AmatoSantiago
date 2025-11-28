import { CommonModule, DatePipe } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SupabaseService } from '../../servicios/supabase';
import { Chart, registerables } from 'chart.js';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

Chart.register(...registerables);

@Component({
  standalone: true,
  selector: 'app-informes',
  imports: [CommonModule, FormsModule, DatePipe],
  templateUrl: './informes.html',
  styleUrls: ['./informes.css']
})
export class Informes implements OnInit {

  turnos: any[] = [];
  logs: any[] = [];

  desde = '';
  hasta = '';

  constructor(private supa: SupabaseService) {}

  async ngOnInit() {
    await this.cargarTurnos();
    await this.cargarLogs();

    this.graficoTurnosPorEspecialidad();
    this.graficoTurnosPorDia();
  }

  // =============================
  // CARGAR TURNOS
  // =============================
  async cargarTurnos() {
    const { data, error } = await this.supa.db
      .from('turnos')
      .select('*')
      .order('fecha');

    if (error) {
      console.error(error);
      return;
    }

    this.turnos = data || [];
  }

  // =============================
  // CARGAR LOG DE INGRESOS
  // =============================
  async cargarLogs() {
    const { data, error } = await this.supa.db
      .from('log_ingresos')
      .select('*')
      .order('fecha', { ascending: false });

    if (error) {
      console.error(error);
      return;
    }

    this.logs = data || [];
  }

  // =============================
  // GRÁFICO: Turnos por especialidad
  // =============================
  graficoTurnosPorEspecialidad() {
    const conteo: any = {};

    this.turnos.forEach(t => {
      if (!conteo[t.especialidad]) conteo[t.especialidad] = 0;
      conteo[t.especialidad]++;
    });

    new Chart('graficoEspecialidad', {
      type: 'bar',
      data: {
        labels: Object.keys(conteo),
        datasets: [{
          label: 'Cantidad',
          data: Object.values(conteo)
        }]
      }
    });
  }

  // =============================
  // GRÁFICO: Turnos por día
  // =============================
  graficoTurnosPorDia() {
    const conteo: any = {};

    this.turnos.forEach(t => {
      const fecha = t.fecha.split('T')[0];
      if (!conteo[fecha]) conteo[fecha] = 0;
      conteo[fecha]++;
    });

    new Chart('graficoDia', {
      type: 'line',
      data: {
        labels: Object.keys(conteo),
        datasets: [{
          label: 'Turnos por día',
          data: Object.values(conteo),
          tension: 0.3
        }]
      }
    });
  }

  // =============================
  // GRÁFICO: Turnos solicitados por médico (rango)
  // =============================
  cargarSolicitadosPorMedico() {
    const desde = new Date(this.desde);
    const hasta = new Date(this.hasta);

    const filtrados = this.turnos.filter(t => {
      const f = new Date(t.fecha);
      return f >= desde && f <= hasta;
    });

    const conteo: any = {};
    filtrados.forEach(t => {
      if (!conteo[t.especialista_nombre]) conteo[t.especialista_nombre] = 0;
      conteo[t.especialista_nombre]++;
    });

    new Chart('graficoSolicitados', {
      type: 'pie',
      data: {
        labels: Object.keys(conteo),
        datasets: [{
          data: Object.values(conteo)
        }]
      }
    });
  }

  // =============================
  // GRÁFICO: Turnos finalizados por médico
  // =============================
  cargarFinalizadosPorMedico() {
    const desde = new Date(this.desde);
    const hasta = new Date(this.hasta);

    const filtrados = this.turnos.filter(t => {
      const f = new Date(t.fecha);
      return t.estado === 'realizado' && f >= desde && f <= hasta;
    });

    const conteo: any = {};
    filtrados.forEach(t => {
      if (!conteo[t.especialista_nombre]) conteo[t.especialista_nombre] = 0;
      conteo[t.especialista_nombre]++;
    });

    new Chart('graficoFinalizados', {
      type: 'doughnut',
      data: {
        labels: Object.keys(conteo),
        datasets: [{
          data: Object.values(conteo)
        }]
      }
    });
  }

  rolClase(rol: string) {
    const clave = (rol || '').toLowerCase();
    if (clave === 'administrador') return 'rol-admin';
    if (clave === 'especialista') return 'rol-especialista';
    if (clave === 'paciente') return 'rol-paciente';
    return '';
  }

  async descargarPdf() {
    const area = document.getElementById('informesWrapper');
    if (!area) {
      console.warn('No se encontrÃ³ el contenedor de informes para exportar');
      return;
    }

    try {
      const canvas = await html2canvas(area, { scale: 2, useCORS: true });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 190;
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 10;

      pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight + 10;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save('informes.pdf');
    } catch (error) {
      console.error('No se pudo generar el PDF de informes', error);
    }
  }
}
