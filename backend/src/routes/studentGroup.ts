import { Hono } from "hono";
import { authAdmin } from "../middlewares/authAdmin";
import { PrismaClient } from "@prisma/client";
import { scheduleInput } from "@pratikndl/common-schedulizer-ems";
import { date, z } from 'zod';

const app = new Hono<{
    Variables: {
        instituteId: String
        prisma: PrismaClient
    }
}>();

app.use(authAdmin);

const studentGroupInput = z.object({
    name: z.string(),
    departmentId: z.string(), 
    batchCount: z.number(),
    passingYear: z.number().min(1900).max(new Date().getFullYear() + 5),
    section: z.string()
})




app.get('/', async (c) => {
    const instituteId = c.get("instituteId") as string;
    const prisma = c.get("prisma")
    const query = c.req.query('name');
    
    try {
        const studentGroups = await prisma.studentGroup.findMany({
            where: {
                name: { contains: query, mode: 'insensitive' } ,
                instituteId: instituteId
            },
            select: {
                id: true,
                name: true,
                passingYear: true,
                section: true,
                batchCount: true,
                department: {
                    select: {
                        code: true
                    }
                }
            }
        });
        return c.json({studentGroups});

    } catch(e) {
        return c.json({message: "Something went wrong"}, {status: 500})
    }
})



app.post('/', async (c) => {
    const instituteId = c.get("instituteId") as string;
    const prisma = c.get("prisma")
    const body = await c.req.json();

    const {data, success, error} = studentGroupInput.safeParse(body);

    if(!success) {
        return c.json({message: "invalid Inputs", error}, {status: 400})
    }
    console.log(data)
    try {        
        
        const existingRecord = await prisma.studentGroup.findFirst({
            where: {
                name: data.name,
                passingYear: data.passingYear,
                section: data.section,
                instituteId: instituteId    
            }
        });

        
        if (existingRecord) {
            return c.json({message: "Record with same details exist"}, {status: 409}); 
        }

        const newRecord = await prisma.studentGroup.create({
            data: {
                ...data,
                instituteId: instituteId
            }
        })

        return c.json({message: "New Schedule Created", newRecord}, {status: 201});

    } catch (e) {
        
        return c.json({message: "Something went wrong"}, {status: 500}); 
    }
})


app.delete('/:id', async (c) => {
    const prisma = c.get("prisma")
    const id = c.req.param('id');

    try {        
        await prisma.studentGroup.delete({
            where:{
                id: id
            }
        })

        return c.json({message: "Record Deleted", }, {status: 201});

    } catch (e) {
        console.error(e);
        return c.json({message: "Something went wrong"}, {status: 500}); 
    }
})

app.get('/:id', async (c) => {
    const prisma = c.get("prisma")
    const id = c.req.param('id');
    
    try {
        const record = await prisma.studentGroup.findFirst({
            where: {
                id: id
            },
            select: {
                id: true,
                name: true,
            }
        });
        return c.json({record});

    } catch(e) {
        return c.json({message: "Something went wrong"}, {status: 500})
    }
})

export default app;