import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks=vi.hoisted(()=>({admin:vi.fn(),transaction:vi.fn(),audit:vi.fn(),tx:{product:{findMany:vi.fn(),updateMany:vi.fn()},productVariant:{update:vi.fn()},priceHistory:{create:vi.fn()}}}));
vi.mock("next/cache",()=>({revalidatePath:vi.fn()}));
vi.mock("@/features/admin/auth/authorization",()=>({requireAdmin:mocks.admin}));
vi.mock("@/features/admin/audit",()=>({writeAudit:mocks.audit}));
vi.mock("@/lib/db/client",()=>({db:{$transaction:mocks.transaction}}));
import { commerceBatchSchema, discountedLoyaltyPrice } from "@/features/admin/commerce-setup-rules";
import { setupCommerceBatchAction } from "@/features/admin/commerce-setup-actions";
const revision="2026-11-26T00:00:00.000Z";
const product={id:"p1",updatedAt:new Date(revision),name:"Oil",standardPriceMinor:10000n,loyaltyPriceMinor:null,acceptsPreOrders:false,status:"ACTIVE",variants:[{id:"v1",priceOverrideMinor:20000n,loyaltyPriceMinor:null},{id:"v2",priceOverrideMinor:null,loyaltyPriceMinor:null}]};
function form(changes:Record<string,string>={}){const value=new FormData();for(const[key,item]of Object.entries({products:JSON.stringify([{id:"p1",updatedAt:revision}]),operation:"LOYALTY",discount:"10",reason:"Owner confirmed loyalty pricing",acknowledged:"on",...changes}))value.set(key,item);return value;}
beforeEach(()=>{vi.resetAllMocks();mocks.admin.mockResolvedValue({id:"admin"});mocks.transaction.mockImplementation(work=>work(mocks.tx));mocks.tx.product.findMany.mockResolvedValue([product]);mocks.tx.product.updateMany.mockResolvedValue({count:1});});
describe("reviewed catalogue setup",()=>{
  it("uses exact cent rounding and never accepts a free or non-discounted result",()=>{
    expect(discountedLoyaltyPrice(12345n,"12.5")).toBe(10802n);
    expect(discountedLoyaltyPrice(1000n,"0.5")).toBe(995n);
  });
  it.each(["0","100","-2","10.123","10e1",""])("rejects an invalid discount %s",discount=>{expect(()=>discountedLoyaltyPrice(10000n,discount)).toThrow();});
  it("rejects discounts that round to zero or leave the same price",()=>{expect(()=>discountedLoyaltyPrice(1n,"99")).toThrow();expect(()=>discountedLoyaltyPrice(100n,"0.01")).toThrow();});
  it("requires unique, bounded selections and explicit acknowledgement",()=>{
    expect(commerceBatchSchema.safeParse({operation:"LOYALTY",products:Array.from({length:51},(_,i)=>({id:String(i),updatedAt:revision})),discount:"10",reason:"Owner pricing",acknowledged:"on"}).success).toBe(false);
    expect(commerceBatchSchema.safeParse({operation:"LOYALTY",products:[{id:"p1",updatedAt:revision},{id:"p1",updatedAt:revision}],discount:"10",reason:"Owner pricing",acknowledged:"on"}).success).toBe(false);
  });
  it("authorizes before any transaction and refuses unacknowledged changes",async()=>{
    mocks.admin.mockRejectedValueOnce(new Error("Forbidden"));expect((await setupCommerceBatchAction({},form())).error).toBeTruthy();expect(mocks.transaction).not.toHaveBeenCalled();
    expect((await setupCommerceBatchAction({},form({acknowledged:""}))).error).toBeTruthy();expect(mocks.transaction).not.toHaveBeenCalled();
  });
  it("calculates every size from its own retail price and records history",async()=>{
    expect((await setupCommerceBatchAction({},form())).success).toBeTruthy();
    expect(mocks.tx.product.updateMany).toHaveBeenCalledWith(expect.objectContaining({data:{loyaltyPriceMinor:9000n}}));
    expect(mocks.tx.productVariant.update).toHaveBeenCalledWith({where:{id:"v1"},data:{loyaltyPriceMinor:18000n}});
    expect(mocks.tx.productVariant.update).toHaveBeenCalledWith({where:{id:"v2"},data:{loyaltyPriceMinor:null}});
    expect(mocks.tx.priceHistory.create).toHaveBeenCalledOnce();expect(mocks.audit).toHaveBeenCalledOnce();
  });
  it("does not change a stale or archived product",async()=>{
    expect((await setupCommerceBatchAction({},form({products:JSON.stringify([{id:"p1",updatedAt:"2026-11-25T00:00:00.000Z"}])}))).error).toMatch(/changed/);
    expect(mocks.tx.product.updateMany).not.toHaveBeenCalled();
    mocks.tx.product.findMany.mockResolvedValue([{...product,status:"ARCHIVED"}]);expect((await setupCommerceBatchAction({},form())).error).toMatch(/Archived/);
  });
  it("enables only future preorder requests without price changes",async()=>{
    expect((await setupCommerceBatchAction({},form({operation:"ENABLE_PREORDERS",discount:""}))).success).toBeTruthy();
    expect(mocks.tx.product.updateMany).toHaveBeenCalledWith(expect.objectContaining({data:{acceptsPreOrders:true}}));
    expect(mocks.tx.priceHistory.create).not.toHaveBeenCalled();expect(mocks.tx.productVariant.update).not.toHaveBeenCalled();
  });
});
